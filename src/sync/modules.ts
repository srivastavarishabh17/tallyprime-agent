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
  getTrialBalanceXML,
  getProfitLossXML,
  getBalanceSheetXML,
  getHSNSummaryXML,
  getGSTSummaryXML,
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
  parseReport,
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
  parse: (xml: string) => any[];
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

  // ── Reports ────────────────────────────────────────────────────────────────
  {
    serverModule: "trial_balance",
    incremental: true,
    getXML: (from, to) => getTrialBalanceXML(from!, to!),
    parse: (xml) => [parseReport(xml)],
  },
  {
    serverModule: "profit_loss",
    incremental: true,
    getXML: (from, to) => getProfitLossXML(from!, to!),
    parse: (xml) => [parseReport(xml)],
  },
  {
    serverModule: "balance_sheet",
    incremental: true,
    getXML: (from, to) => getBalanceSheetXML(from!, to!),
    parse: (xml) => [parseReport(xml)],
  },
  {
    serverModule: "hsn_summary",
    incremental: true,
    getXML: (from, to) => getHSNSummaryXML(from!, to!),
    parse: (xml) => [parseReport(xml)],
  },
  {
    serverModule: "gst_summary",
    incremental: true,
    getXML: (from, to) => getGSTSummaryXML(from!, to!),
    parse: (xml) => [parseReport(xml)],
  },
];
