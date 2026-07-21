import { startScheduler } from "./sync/scheduler";
import { captureConsole, setErrorHandler, startShipping } from "./logger";
import { reportError } from "./mailer";

captureConsole();
setErrorHandler(reportError);
startShipping();

console.log("================================");
console.log("      Satyakiran Agent");
console.log("================================");

try {
  startScheduler();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
