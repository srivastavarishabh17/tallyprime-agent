import * as fs from "fs";
import * as path from "path";

export interface AgentConfig {
  tally: {
    host: string;
    timeoutMs: number;
  };
  server: {
    api: string;
    token: string;
    device_id: string;
    company_id: number;
  };
  syncInterval: string;
}

export function loadConfig(): AgentConfig {
  const configPath = path.join(process.cwd(), "agent.config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`agent.config.json not found at ${configPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  const tally = raw["tally"] as Record<string, unknown> | undefined;
  const server = raw["server"] as Record<string, unknown> | undefined;

  if (!tally?.["host"]) throw new Error("agent.config.json: missing tally.host");
  if (!server?.["api"]) throw new Error("agent.config.json: missing server.api");
  if (!server?.["token"]) throw new Error("agent.config.json: missing server.token");
  if (!server?.["device_id"]) throw new Error("agent.config.json: missing server.device_id");
  if (server?.["company_id"] === undefined) throw new Error("agent.config.json: missing server.company_id");
  if (!raw["syncInterval"]) throw new Error("agent.config.json: missing syncInterval");

  return {
    tally: {
      host: tally["host"] as string,
      timeoutMs: (tally["timeoutMs"] as number | undefined) ?? 10000,
    },
    server: {
      api: server["api"] as string,
      token: server["token"] as string,
      device_id: server["device_id"] as string,
      company_id: server["company_id"] as number,
    },
    syncInterval: raw["syncInterval"] as string,
  };
}
