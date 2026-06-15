import cron from "node-cron";
import { loadConfig } from "../config";
import { syncLedgers } from "./pull";
import { pushInvoices } from "./push";

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
    try {
      await syncLedgers();
      await pushInvoices();
    } catch (error) {
      console.error("Sync failed:", error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };

  void sync();
  return cron.schedule(config.syncInterval, sync);
}
