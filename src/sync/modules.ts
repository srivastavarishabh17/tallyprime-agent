import {
  getCompanyXML,
  getLedgersXML,
  getStockGroupsXML,
  getStockCategoriesXML,
  getStockItemsXML,
  getUnitsXML,
  getGodownsXML,
  getCostCentresXML,
  getCostCategoriesXML,
  getVoucherTypesXML,
  getCustomerMastersXML,
  getSupplierMastersXML,
  getBankMastersXML,
  getStockBalancesXML,
  getCustomerOutstandingXML,
  getSupplierOutstandingXML,
  getSalesVouchersXML,
  getPurchaseVouchersXML,
  getPaymentVouchersXML,
  getReceiptVouchersXML,
  getJournalVouchersXML,
  getContraVouchersXML,
  getCreditNotesXML,
  getDebitNotesXML,
  getStockJournalXML,
  getDeliveryChallanXML,
  getSalesOrdersXML,
  getPurchaseOrdersXML,
  getDayBookXML,
  getBatchDetailsXML,
} from "../tally/requests";

import {
  parseCompany,
  parseLedgers,
  parseStockGroups,
  parseStockCategories,
  parseStockItems,
  parseUnits,
  parseGodowns,
  parseCostCentres,
  parseCostCategories,
  parseVoucherTypes,
  parseVouchers,
  parseBatchDetails,
} from "../tally/parser";

export interface SyncModule {
  /** Server module name — sent as `module` in the API payload */
  serverModule: string;
  /**
   * incremental=false → full sync every cycle (masters, no date param)
   * incremental=true  → date-range sync using lastSyncTime
   */
  incremental: boolean;
  getXML: (from?: string, to?: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse: (xml: string, from?: string, to?: string) => any[];
}

export const SYNC_MODULES: SyncModule[] = [
  // ── Masters ────────────────────────────────────────────────────────────────
  {
    serverModule: "company",
    incremental: false,
    getXML: () => getCompanyXML(),
    parse: parseCompany,
  },
  {
    serverModule: "ledgers",
    incremental: false,
    getXML: () => getLedgersXML(),
    parse: parseLedgers,
  },
  {
    serverModule: "stock_groups",
    incremental: false,
    getXML: () => getStockGroupsXML(),
    parse: parseStockGroups,
  },
  {
    serverModule: "stock_categories",
    incremental: false,
    getXML: () => getStockCategoriesXML(),
    parse: parseStockCategories,
  },
  {
    serverModule: "stock_items",
    incremental: false,
    getXML: () => getStockItemsXML(),
    parse: parseStockItems,
  },
  {
    serverModule: "units",
    incremental: false,
    getXML: () => getUnitsXML(),
    parse: parseUnits,
  },
  {
    serverModule: "godowns",
    incremental: false,
    getXML: () => getGodownsXML(),
    parse: parseGodowns,
  },
  {
    serverModule: "cost_centres",
    incremental: false,
    getXML: () => getCostCentresXML(),
    parse: parseCostCentres,
  },
  {
    serverModule: "cost_categories",
    incremental: false,
    getXML: () => getCostCategoriesXML(),
    parse: parseCostCategories,
  },
  {
    serverModule: "voucher_types",
    incremental: false,
    getXML: () => getVoucherTypesXML(),
    parse: parseVoucherTypes,
  },
  {
    serverModule: "customer_masters",
    incremental: false,
    getXML: () => getCustomerMastersXML(),
    parse: parseLedgers,
  },
  {
    serverModule: "supplier_masters",
    incremental: false,
    getXML: () => getSupplierMastersXML(),
    parse: parseLedgers,
  },
  {
    serverModule: "bank_masters",
    incremental: false,
    getXML: () => getBankMastersXML(),
    parse: parseLedgers,
  },
  {
    serverModule: "batch_details",
    incremental: false,
    getXML: () => getBatchDetailsXML(),
    parse: parseBatchDetails,
  },

  // ── Date-range masters ─────────────────────────────────────────────────────
  {
    serverModule: "stock_balances",
    incremental: true,
    getXML: (from, to) => getStockBalancesXML(from!, to!),
    parse: parseStockItems,
  },
  {
    serverModule: "customer_outstanding",
    incremental: true,
    getXML: (from, to) => getCustomerOutstandingXML(from!, to!),
    parse: parseLedgers,
  },
  {
    serverModule: "supplier_outstanding",
    incremental: true,
    getXML: (from, to) => getSupplierOutstandingXML(from!, to!),
    parse: parseLedgers,
  },

  // ── Vouchers ───────────────────────────────────────────────────────────────
  {
    serverModule: "sales_vouchers",
    incremental: true,
    getXML: (from, to) => getSalesVouchersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "purchase_vouchers",
    incremental: true,
    getXML: (from, to) => getPurchaseVouchersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "payment_vouchers",
    incremental: true,
    getXML: (from, to) => getPaymentVouchersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "receipt_vouchers",
    incremental: true,
    getXML: (from, to) => getReceiptVouchersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "journal_vouchers",
    incremental: true,
    getXML: (from, to) => getJournalVouchersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "contra_vouchers",
    incremental: true,
    getXML: (from, to) => getContraVouchersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "credit_notes",
    incremental: true,
    getXML: (from, to) => getCreditNotesXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "debit_notes",
    incremental: true,
    getXML: (from, to) => getDebitNotesXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "stock_journals",
    incremental: true,
    getXML: (from, to) => getStockJournalXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "delivery_challans",
    incremental: true,
    getXML: (from, to) => getDeliveryChallanXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "sales_orders",
    incremental: true,
    getXML: (from, to) => getSalesOrdersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "purchase_orders",
    incremental: true,
    getXML: (from, to) => getPurchaseOrdersXML(from!, to!),
    parse: parseVouchers,
  },
  {
    serverModule: "day_book",
    incremental: true,
    getXML: (from, to) => getDayBookXML(from!, to!),
    parse: parseVouchers,
  },

];
// Note: trial_balance, profit_loss, balance_sheet, hsn_summary, gst_summary are removed.
// Tally Prime does not support these as Collection exports — they cause TDL errors.
// These reports should be generated server-side from voucher and ledger data.
