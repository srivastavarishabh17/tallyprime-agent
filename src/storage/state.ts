import * as fs from "fs";
import * as path from "path";

interface AgentState {
  lastSyncTime: string | null;
  moduleSyncTime: Record<string, string>;
}

const STATE_FILE = path.join(process.cwd(), "agent.state.json");

function read(): AgentState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as AgentState;
  } catch {
    return { lastSyncTime: null, moduleSyncTime: {} };
  }
}

function write(state: AgentState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function getLastSyncTime(): Date | null {
  const t = read().lastSyncTime;
  return t ? new Date(t) : null;
}

export function setLastSyncTime(date: Date): void {
  const s = read();
  s.lastSyncTime = date.toISOString();
  write(s);
}

export function getModuleSyncTime(module: string): Date | null {
  const t = read().moduleSyncTime[module];
  return t ? new Date(t) : null;
}

export function setModuleSyncTime(module: string, date: Date): void {
  const s = read();
  s.moduleSyncTime[module] = date.toISOString();
  write(s);
}
