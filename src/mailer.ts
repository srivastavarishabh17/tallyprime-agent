import * as nodemailer from "nodemailer";
import { tryLoadConfig } from "./config";
import { rawConsole } from "./logger";

const PENDING_MAX = 50;

let pendingErrors: { timestamp: string; message: string }[] = [];
let lastSentAt = 0;
let sendTimer: NodeJS.Timeout | null = null;
let warnedNotConfigured = false;

/**
 * Queue an error for emailing. Errors are batched into a single digest
 * mail, sent at most once per `throttleMinutes` (default 15).
 */
export function reportError(message: string): void {
  pendingErrors.push({ timestamp: new Date().toISOString(), message });
  if (pendingErrors.length > PENDING_MAX) pendingErrors.shift();
  scheduleSend();
}

function scheduleSend(): void {
  if (sendTimer) return;

  const config = tryLoadConfig();
  const email = config?.alerts?.email;
  if (!email?.enabled || !email.user || !email.appPassword || !email.to) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      rawConsole.warn("mailer: email alerts not configured; error emails are disabled");
    }
    return;
  }

  const throttleMs = email.throttleMinutes * 60_000;
  const wait = Math.max(0, lastSentAt + throttleMs - Date.now());
  sendTimer = setTimeout(() => void sendDigest(), wait);
}

async function sendDigest(): Promise<void> {
  sendTimer = null;
  if (pendingErrors.length === 0) return;

  const config = tryLoadConfig();
  const email = config?.alerts?.email;
  if (!config || !email?.enabled || !email.user || !email.appPassword || !email.to) return;

  const errors = pendingErrors;
  pendingErrors = [];
  // advance the throttle window even if the send fails, so a broken SMTP
  // setup doesn't turn into a tight retry loop
  lastSentAt = Date.now();

  const device = config.server.device_id;
  const subject = `[Satyakiran Agent] ${errors.length} error${errors.length === 1 ? "" : "s"} on ${device}`;
  const body = [
    `The TallyPrime sync agent on device "${device}" reported the following error(s):`,
    "",
    ...errors.map((e) => `${e.timestamp}\n${e.message}\n`),
    "---",
    `Full logs: check the server agent-logs endpoint or the local log file on ${device}.`,
  ].join("\n");

  try {
    const transporter = nodemailer.createTransport({
      host: email.smtpHost,
      port: email.smtpPort,
      secure: email.smtpPort === 465,
      auth: { user: email.user, pass: email.appPassword },
    });

    await transporter.sendMail({
      from: `"Satyakiran Agent (${device})" <${email.user}>`,
      to: email.to,
      subject,
      text: body,
    });
    rawConsole.log(`mailer: sent error digest (${errors.length} errors) to ${email.to}`);
  } catch (err) {
    // keep the errors for the next digest window
    pendingErrors = [...errors, ...pendingErrors].slice(-PENDING_MAX);
    rawConsole.error(
      "mailer: failed to send alert email:",
      err instanceof Error ? err.message : err
    );
    scheduleSend();
  }
}
