import * as fs from "fs";
import { configPath } from "./paths";

export interface EmailAlertConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  user: string;
  appPassword: string;
  to: string;
  throttleMinutes: number;
}

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
  /** If set, only these modules will be synced. If omitted, all modules run. */
  enabledModules?: string[];
  alerts?: {
    email?: EmailAlertConfig;
  };
}

function parseEmailAlerts(raw: Record<string, unknown> | undefined): EmailAlertConfig | undefined {
  const email = (raw?.["email"] ?? undefined) as Record<string, unknown> | undefined;
  if (!email) return undefined;

  return {
    enabled: Boolean(email["enabled"]),
    smtpHost: (email["smtpHost"] as string | undefined) ?? "smtp.gmail.com",
    smtpPort: (email["smtpPort"] as number | undefined) ?? 465,
    user: (email["user"] as string | undefined) ?? "",
    appPassword: (email["appPassword"] as string | undefined) ?? "",
    to: (email["to"] as string | undefined) ?? "",
    throttleMinutes: (email["throttleMinutes"] as number | undefined) ?? 15,
  };
}

export function loadConfig(): AgentConfig {
  const file = configPath();
  if (!fs.existsSync(file)) {
    throw new Error(`agent.config.json not found at ${file}`);
  }

  const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  const tally = raw["tally"] as Record<string, unknown> | undefined;
  const server = raw["server"] as Record<string, unknown> | undefined;

  if (!tally?.["host"]) throw new Error("agent.config.json: missing tally.host");
  if (!server?.["api"]) throw new Error("agent.config.json: missing server.api");
  if (!server?.["token"]) throw new Error("agent.config.json: missing server.token");
  if (!server?.["device_id"]) throw new Error("agent.config.json: missing server.device_id");
  if (server?.["company_id"] === undefined) throw new Error("agent.config.json: missing server.company_id");
  if (!raw["syncInterval"]) throw new Error("agent.config.json: missing syncInterval");

  const emailAlerts = parseEmailAlerts(raw["alerts"] as Record<string, unknown> | undefined);

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
    ...(raw["enabledModules"] ? { enabledModules: raw["enabledModules"] as string[] } : {}),
    ...(emailAlerts ? { alerts: { email: emailAlerts } } : {}),
  };
}

/** Like loadConfig() but returns null instead of throwing (for UI status). */
export function tryLoadConfig(): AgentConfig | null {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}

export function saveConfig(config: AgentConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/** Base URL of the server, e.g. https://inventory.satyakiran.co.in */
export function serverOrigin(config: AgentConfig): string {
  return new URL(config.server.api).origin;
}
