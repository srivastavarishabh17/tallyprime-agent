import { fetchPendingInvoices } from "../config/api";
import { sendToTally } from "../tally/client";
import { escapeXML } from "../tally/requests";

export async function pushInvoices() {
  const invoices = await fetchPendingInvoices();

  for (const invoice of invoices) {

    const xml = `
<ENVELOPE>
 <HEADER>
   <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDATA>
    <TALLYMESSAGE>
      <LEDGER Action="Create">
        <NAME>${escapeXML(invoice.customer)}</NAME>
        <PARENT>Sundry Debtors</PARENT>
      </LEDGER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;

    await sendToTally(xml);
  }
}
