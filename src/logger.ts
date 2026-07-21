import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import axios from "axios";
import { tryLoadConfig, serverOrigin } from "./config";
import { logDir } from "./paths";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
}

/**
 * Originals captured before captureConsole() patches them. Everything inside
 * the logging pipeline itself (ship failures, mail failures) must use these,
 * otherwise a failing pipeline would feed its own errors back into itself.
 */
export const rawConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const BUFFER_MAX = 500;
const SHIP_QUEUE_MAX = 1000;
const SHIP_BATCH_MAX = 100;
const SHIP_INTERVAL_MS = 30_000;
const LOG_FILE_MAX_BYTES = 5 * 1024 * 1024;

const buffer: LogEntry[] = [];
const shipQueue: LogEntry[] = [];
const listeners = new Set<(entry: LogEntry) => void>();

let onError: ((message: string) => void) | null = null;
let shipTimer: NodeJS.Timeout | null = null;
let shipping = false;

/** Called for every error-level entry (wired to the mailer at startup). */
export function setErrorHandler(handler: (message: string) => void): void {
  onError = handler;
}

export function subscribe(listener: (entry: LogEntry) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recentLogs(): LogEntry[] {
  return [...buffer];
}

function logFilePath(): string {
  return path.join(logDir(), "agent.log");
}

function appendToFile(entry: LogEntry): void {
  try {
    const file = logFilePath();
    try {
      if (fs.statSync(file).size > LOG_FILE_MAX_BYTES) {
        fs.renameSync(file, file + ".1");
      }
    } catch {
      // file doesn't exist yet
    }
    fs.appendFileSync(file, `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}\n`);
  } catch (err) {
    rawConsole.error("logger: failed to write log file:", err);
  }
}

export function log(level: LogLevel, message: string): void {
  const entry: LogEntry = { level, message, timestamp: new Date().toISOString() };

  buffer.push(entry);
  if (buffer.length > BUFFER_MAX) buffer.shift();

  shipQueue.push(entry);
  if (shipQueue.length > SHIP_QUEUE_MAX) shipQueue.shift();

  appendToFile(entry);

  for (const listener of listeners) {
    try {
      listener(entry);
    } catch {
      // a broken listener must not break logging
    }
  }

  if (level === "error" && onError) {
    try {
      onError(message);
    } catch (err) {
      rawConsole.error("logger: error handler failed:", err);
    }
  }
}

/**
 * Mirror console.log/info/warn/error into the logger so every existing
 * console call in the sync code flows to the file, the dashboard, the
 * server, and (for errors) email — without touching that code.
 */
export function captureConsole(): void {
  console.log = (...args: unknown[]) => {
    rawConsole.log(...args);
    log("info", util.format(...args));
  };
  console.info = console.log;
  console.warn = (...args: unknown[]) => {
    rawConsole.warn(...args);
    log("warn", util.format(...args));
  };
  console.error = (...args: unknown[]) => {
    rawConsole.error(...args);
    log("error", util.format(...args));
  };
}

async function flushShipQueue(): Promise<void> {
  if (shipping || shipQueue.length === 0) return;

  const config = tryLoadConfig();
  if (!config) return;

  shipping = true;
  const batch = shipQueue.splice(0, SHIP_BATCH_MAX);

  try {
    await axios.post(
      `${serverOrigin(config)}/api/tally/agent-logs`,
      {
        device_id: config.server.device_id,
        company_id: config.server.company_id,
        logs: batch.map((e) => ({
          level: e.level,
          message: e.message,
          timestamp: e.timestamp,
        })),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.server.token}`,
        },
        timeout: 15_000,
      }
    );
  } catch (err) {
    // put the batch back (bounded) and retry on the next tick
    shipQueue.unshift(...batch);
    while (shipQueue.length > SHIP_QUEUE_MAX) shipQueue.shift();
    rawConsole.warn(
      "logger: shipping logs to server failed, will retry:",
      err instanceof Error ? err.message : err
    );
  } finally {
    shipping = false;
  }
}

export function startShipping(): void {
  if (shipTimer) return;
  shipTimer = setInterval(() => void flushShipQueue(), SHIP_INTERVAL_MS);
}

export async function stopShipping(): Promise<void> {
  if (shipTimer) {
    clearInterval(shipTimer);
    shipTimer = null;
  }
  await flushShipQueue();
}
