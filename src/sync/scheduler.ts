import cron from "node-cron";
import { loadConfig } from "../config";
import { tallyDate } from "../tally/requests";
import { syncAll } from "./pull";
import { pushInvoices } from "./push";
import { getLastSyncTime, setLastSyncTime } from "../storage/state";

/** Returns the start of the Indian financial year (April 1) for the given date */
function financialYearStart(now: Date): Date {
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1); // April 1
}

/**
 * from = last successful sync time, or financial year start if never synced
 * to   = today
 */
function syncDateRange(): { from: string; to: string } {
  const now = new Date();
  const last = getLastSyncTime();
  const from = last ?? financialYearStart(now);
  return {
    from: tallyDate(from),
    to: tallyDate(now),
  };
}

export function startScheduler() {
  const config = loadConfig();
  let running = false;

  if (!cron.validate(config.syncInterval)) {
    throw new Error(`Invalid syncInterval: ${config.syncInterval}`);
  }

  const sync = async () => {
    if (running) {
      console.warn("Previous sync is still running; skipping this cycle.");
      return;
    }

    running = true;
    const started = new Date();
    console.log(`\n[${started.toISOString()}] Starting sync cycle`);

    try {
      const { from, to } = syncDateRange();
      await syncAll(from, to);
      await pushInvoices();
      setLastSyncTime(started);
      console.log(`Sync cycle complete.`);
    } catch (err) {
      console.error("Sync cycle failed:", err instanceof Error ? err.message : err);
    } finally {
      running = false;
    }
  };

  void sync();
  return cron.schedule(config.syncInterval, sync);
}
