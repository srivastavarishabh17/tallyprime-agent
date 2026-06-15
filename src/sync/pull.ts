import { sendToTally } from "../tally/client";
import { getLedgersXML } from "../tally/requests";
import { parseLedgers } from "../tally/parser";
import { uploadLedgers } from "../server/api";

export async function syncLedgers() {
  console.log("Syncing ledgers...");

  const xml = getLedgersXML();
  const response = await sendToTally(xml);
  const ledgers = parseLedgers(response);

  console.log(`  Found ${ledgers.length} ledgers from Tally`);

  await uploadLedgers(ledgers);

  console.log("Ledgers synced.");
}
