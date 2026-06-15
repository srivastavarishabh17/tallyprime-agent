import { sendToTally } from "../tally/client";
import { uploadLedgers } from "../server/api";
import { syncToServer } from "../server/api";
import { setModuleSyncTime } from "../storage/state";
import { loadConfig } from "../config";
import { SYNC_MODULES } from "./modules";

interface AxiosLike {
  response?: { status?: number; data?: unknown };
  code?: string;
}

function fmtError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const ax = err as AxiosLike;
  const parts: string[] = [err.message || "(no message)"];
  if (ax.code) parts.push(`code=${ax.code}`);
  if (ax.response?.status) parts.push(`HTTP ${ax.response.status}`);
  if (ax.response?.data) parts.push(`data=${JSON.stringify(ax.response.data)}`);
  return parts.join(" | ");
}

const CHUNK_SIZE = 500;

/** Upload records to server in chunks of CHUNK_SIZE */
async function uploadModule(serverModule: string, data: unknown[]): Promise<void> {
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await syncToServer(serverModule, "push", { data: chunk, offset: i, total: data.length });
  }
}

export async function syncAll(from: string, to: string): Promise<void> {
  const config = loadConfig();
  const enabledSet = config.enabledModules ? new Set(config.enabledModules) : null;
  const modules = enabledSet ? SYNC_MODULES.filter(m => enabledSet.has(m.serverModule)) : SYNC_MODULES;

  console.log(`Sync range: ${from} → ${to} (${modules.length} modules)`);

  for (const mod of modules) {
    try {
      const xml = mod.incremental ? mod.getXML(from, to) : mod.getXML();
      const response = await sendToTally(xml);

      const records = mod.parse(response, mod.incremental ? from : undefined, mod.incremental ? to : undefined);

      if (records.length === 0) {
        console.log(`  [${mod.serverModule}] 0 records — skipped`);
        continue;
      }

      await uploadModule(mod.serverModule, records);
      setModuleSyncTime(mod.serverModule, new Date());
      console.log(`  [${mod.serverModule}] ${records.length} records`);
    } catch (err) {
      console.error(`  [${mod.serverModule}] ERROR: ${fmtError(err)}`);
    }
  }
}

// keep the named export so push.ts and old imports still work
export { uploadLedgers };
