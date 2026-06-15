import { sendToTally } from "../tally/client";
import { uploadLedgers } from "../server/api";
import { syncToServer } from "../server/api";
import { setModuleSyncTime } from "../storage/state";
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

/** Upload parsed records to server */
async function uploadModule(serverModule: string, data: unknown[]): Promise<void> {
  await syncToServer(serverModule, "push", { data });
}

export async function syncAll(from: string, to: string): Promise<void> {
  console.log(`Sync range: ${from} → ${to} (${SYNC_MODULES.length} modules)`);

  for (const mod of SYNC_MODULES) {
    try {
      const xml = mod.incremental ? mod.getXML(from, to) : mod.getXML();
      const response = await sendToTally(xml);
      const records = mod.parse(response);

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
