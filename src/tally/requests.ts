// ─── Helpers ─────────────────────────────────────────────────────────────────

export function escapeXML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Format a Date as YYYYMMDD for Tally static variables */
export function tallyDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// ─── Internal builders ────────────────────────────────────────────────────────

/** Generic master export — no date range, full collection */
function masterXML(collectionId: string): string {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>${collectionId}</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
   </STATICVARIABLES>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

/** Vouchers filtered by type and date range via TDL */
function vouchersXML(voucherType: string | null, from: string, to: string): string {
  const filterFormula = voucherType
    ? `($$InRange:$Date:$$ToDate:${from}:$$ToDate:${to}) AND ($VoucherTypeName = "${voucherType}")`
    : `$$InRange:$Date:$$ToDate:${from}:$$ToDate:${to}`;

  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>VchExport</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVFROMDATE>${from}</SVFROMDATE>
    <SVTODATE>${to}</SVTODATE>
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="VchExport" ISMODIFY="No">
      <TYPE>Voucher</TYPE>
      <FILTERS>VchFilter</FILTERS>
     </COLLECTION>
     <SYSTEM TYPE="Formulae" NAME="VchFilter">${filterFormula}</SYSTEM>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

/** Ledgers filtered by parent group */
function ledgersByGroupXML(parentGroup: string): string {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>FilteredLedgers</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="FilteredLedgers" ISMODIFY="Yes">
      <TYPE>Ledger</TYPE>
      <FILTERS>GroupFilter</FILTERS>
     </COLLECTION>
     <SYSTEM TYPE="Formulae" NAME="GroupFilter">$$InList:$Parent:"${parentGroup}"</SYSTEM>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

/** Generic report export with date range */
function reportXML(reportId: string, from: string, to: string): string {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>${reportId}</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVFROMDATE>${from}</SVFROMDATE>
    <SVTODATE>${to}</SVTODATE>
   </STATICVARIABLES>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

// ─── Masters (full sync, no date filter) ─────────────────────────────────────

export function getCompanyXML(): string {
  return masterXML("List of Companies");
}

export function getLedgersXML(): string {
  return masterXML("List of Ledgers");
}

export function getStockGroupsXML(): string {
  return masterXML("List of Stock Groups");
}

export function getStockCategoriesXML(): string {
  return masterXML("List of Stock Categories");
}

export function getStockItemsXML(): string {
  return masterXML("List of Stock Items");
}

export function getUnitsXML(): string {
  return masterXML("List of Units");
}

export function getGodownsXML(): string {
  return masterXML("List of Godowns");
}

export function getCostCentresXML(): string {
  return masterXML("List of Cost Centres");
}

export function getCostCategoriesXML(): string {
  return masterXML("List of Cost Categories");
}

export function getVoucherTypesXML(): string {
  return masterXML("List of Voucher Types");
}

export function getCustomerMastersXML(): string {
  return ledgersByGroupXML("Sundry Debtors");
}

export function getSupplierMastersXML(): string {
  return ledgersByGroupXML("Sundry Creditors");
}

export function getBankMastersXML(): string {
  return ledgersByGroupXML("Bank Accounts");
}

/** Stock items with closing balance — needs date context */
export function getStockBalancesXML(from: string, to: string): string {
  return reportXML("List of Stock Items", from, to);
}

// ─── Outstanding ──────────────────────────────────────────────────────────────

export function getCustomerOutstandingXML(from: string, to: string): string {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>OutstandingReceivables</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVFROMDATE>${from}</SVFROMDATE>
    <SVTODATE>${to}</SVTODATE>
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="OutstandingReceivables" ISMODIFY="No">
      <TYPE>Ledger</TYPE>
      <FILTERS>DebtorFilter</FILTERS>
     </COLLECTION>
     <SYSTEM TYPE="Formulae" NAME="DebtorFilter">$$InList:$Parent:"Sundry Debtors"</SYSTEM>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

export function getSupplierOutstandingXML(from: string, to: string): string {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>OutstandingPayables</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVFROMDATE>${from}</SVFROMDATE>
    <SVTODATE>${to}</SVTODATE>
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="OutstandingPayables" ISMODIFY="No">
      <TYPE>Ledger</TYPE>
      <FILTERS>CreditorFilter</FILTERS>
     </COLLECTION>
     <SYSTEM TYPE="Formulae" NAME="CreditorFilter">$$InList:$Parent:"Sundry Creditors"</SYSTEM>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

// ─── Vouchers (incremental, with date filter) ─────────────────────────────────

export function getSalesVouchersXML(from: string, to: string): string {
  return vouchersXML("Sales", from, to);
}

export function getPurchaseVouchersXML(from: string, to: string): string {
  return vouchersXML("Purchase", from, to);
}

export function getPaymentVouchersXML(from: string, to: string): string {
  return vouchersXML("Payment", from, to);
}

export function getReceiptVouchersXML(from: string, to: string): string {
  return vouchersXML("Receipt", from, to);
}

export function getJournalVouchersXML(from: string, to: string): string {
  return vouchersXML("Journal", from, to);
}

export function getContraVouchersXML(from: string, to: string): string {
  return vouchersXML("Contra", from, to);
}

export function getCreditNotesXML(from: string, to: string): string {
  return vouchersXML("Credit Note", from, to);
}

export function getDebitNotesXML(from: string, to: string): string {
  return vouchersXML("Debit Note", from, to);
}

export function getStockJournalXML(from: string, to: string): string {
  return vouchersXML("Stock Journal", from, to);
}

export function getDeliveryChallanXML(from: string, to: string): string {
  return vouchersXML("Delivery Note", from, to);
}

export function getSalesOrdersXML(from: string, to: string): string {
  return vouchersXML("Sales Order", from, to);
}

export function getPurchaseOrdersXML(from: string, to: string): string {
  return vouchersXML("Purchase Order", from, to);
}

export function getDayBookXML(from: string, to: string): string {
  return vouchersXML(null, from, to);
}

export function getBankTransactionsXML(from: string, to: string): string {
  return reportXML("Day Book", from, to);
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getTrialBalanceXML(from: string, to: string): string {
  return reportXML("Trial Balance", from, to);
}

export function getProfitLossXML(from: string, to: string): string {
  return reportXML("Profit & Loss", from, to);
}

export function getBalanceSheetXML(from: string, to: string): string {
  return reportXML("Balance Sheet", from, to);
}

export function getHSNSummaryXML(from: string, to: string): string {
  return reportXML("HSN Summary", from, to);
}

export function getGSTSummaryXML(from: string, to: string): string {
  return reportXML("GSTR-1", from, to);
}

// ─── Batch / Serial numbers ───────────────────────────────────────────────────

export function getBatchDetailsXML(): string {
  return `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>BatchDetails</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="BatchDetails" ISMODIFY="No">
      <TYPE>Batch</TYPE>
     </COLLECTION>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

// ─── Company info (for financial year detection) ──────────────────────────────

export function getCompanyInfoXML(): string {
  return masterXML("List of Companies");
}
