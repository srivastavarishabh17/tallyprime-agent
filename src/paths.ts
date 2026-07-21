import * as fs from "fs";
import * as path from "path";

/**
 * Directory where the agent keeps its mutable files (config, state, logs).
 *
 * The Electron main process sets AGENT_DATA_DIR to app.getPath("userData")
 * before anything else loads, because a packaged app cannot write next to
 * its own executable. In dev / headless mode it falls back to the cwd.
 */
export function dataDir(): string {
  const dir = process.env["AGENT_DATA_DIR"] || process.cwd();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function configPath(): string {
  return path.join(dataDir(), "agent.config.json");
}

export function statePath(): string {
  return path.join(dataDir(), "agent.state.json");
}

export function logDir(): string {
  const dir = path.join(dataDir(), "logs");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
