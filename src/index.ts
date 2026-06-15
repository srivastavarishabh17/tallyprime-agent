import { startScheduler } from "./sync/scheduler";

console.log("================================");
console.log("      Aozo Sync Agent");
console.log("================================");

try {
  startScheduler();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
