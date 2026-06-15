import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (tagName) =>
    [
      "LEDGER", "STOCKITEM", "STOCKGROUP", "STOCKCATEGORY", "UNIT",
      "GODOWN", "COSTCENTRE", "COSTCATEGORY", "VOUCHERTYPE", "COMPANY",
      "VOUCHER", "ALLLEDGERENTRIES", "INVENTORYENTRIES", "BATCHALLOCATIONS",
      "LEDGSTREGDETAILS", "LEDCONTACTDETAILS", "ADDRESSLIST",
      "BATCH", "COSTCENTREALLOCATION",
    ].includes(tagName),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TallyObj = Record<string, unknown>;

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function str(val: unknown): string {
  return String(val ?? "").trim();
}

function num(val: unknown): number {
  const s = str(val).replace(/[^\d.-]/g, "");
  return parseFloat(s) || 0;
}

/** Name can be attribute @_NAME or child element NAME */
function name(obj: TallyObj): string {
  return str(obj["@_NAME"] ?? obj["NAME"]);
}

/** Navigate into the standard Tally export envelope and return the COLLECTION or TALLYMESSAGE child */
function getCollection(xml: string): TallyObj | null {
  const parsed = parser.parse(xml) as TallyObj;
  const envelope = parsed["ENVELOPE"] as TallyObj | undefined;
  const body = envelope?.["BODY"] as TallyObj | undefined;
  const exportData = body?.["EXPORTDATA"] as TallyObj | undefined;
  const requestData = exportData?.["REQUESTDATA"] as TallyObj | undefined;
  const tallyMsg = requestData?.["TALLYMESSAGE"] as TallyObj | undefined;
  if (!tallyMsg) return null;
  const collection = tallyMsg["COLLECTION"] as TallyObj | undefined;
  return collection ?? tallyMsg;
}

export function parseXML(xml: string): unknown {
  return parser.parse(xml);
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface TallyCompany {
  name: string;
  books_beginning_from: string;
  current_period_from: string;
  current_period_to: string;
  gstn: string;
  state: string;
  pincode: string;
}

export function parseCompany(xml: string): TallyCompany[] {
  const col = getCollection(xml);
  if (!col) return [];
  const items = toArray(col["COMPANY"] as TallyObj | TallyObj[]);
  return items
    .map((c): TallyCompany => ({
      name: name(c),
      books_beginning_from: str(c["BOOKSBEGINNINGFROM"]),
      current_period_from: str(c["CURRENTPERIODFROMDATE"] ?? c["CURRENTPERIODFROM"]),
      current_period_to: str(c["CURRENTPERIODTODATE"] ?? c["CURRENTPERIODTO"]),
      gstn: str(c["GSTNUMBER"] ?? c["GSTNFORREGULARDEALER"]),
      state: str(c["STATENAME"]),
      pincode: str(c["PINCODE"]),
    }))
    .filter((c) => c.name.length > 0);
}

// ─── Ledgers ──────────────────────────────────────────────────────────────────

export interface TallyLedger {
  ledger_name: string;
  parent: string;
  opening_balance: number;
  closing_balance: number;
  gstin: string;
  gstn_type: string;
  mobile: string;
  email: string;
  state: string;
  pincode: string;
  mailing_name: string;
}

export function parseLedgers(xml: string): TallyLedger[] {
  const col = getCollection(xml);
  if (!col) return [];
  const items = toArray(col["LEDGER"] as TallyObj | TallyObj[]);

  return items
    .map((l): TallyLedger => {
      const gstList = toArray(l["LEDGSTREGDETAILS.LIST"] as TallyObj | TallyObj[]);
      const gst = gstList[0] ?? {};
      return {
        ledger_name: name(l),
        parent: str(l["PARENT"]),
        opening_balance: num(l["OPENINGBALANCE"]),
        closing_balance: num(l["CLOSINGBALANCE"]),
        gstin: str(gst["GSTIN"]),
        gstn_type: str(gst["GSTREGNTYPE"]),
        mobile: str(l["LEDMOBNO"]),
        email: str(l["EMAIL"] ?? l["EMAILID"]),
        state: str(l["LEDSTATENAME"] ?? l["STATENAME"]),
        pincode: str(l["PINCODE"]),
        mailing_name: str(l["MAILINGNAME"]),
      };
    })
    .filter((l) => l.ledger_name.length > 0);
}

// ─── Stock Groups ──────────────────────────────────────────────────────────────

export interface TallyStockGroup {
  name: string;
  parent: string;
  is_addable: string;
}

export function parseStockGroups(xml: string): TallyStockGroup[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["STOCKGROUP"] as TallyObj | TallyObj[])
    .map((g): TallyStockGroup => ({
      name: name(g),
      parent: str(g["PARENT"]),
      is_addable: str(g["ISADDABLE"]),
    }))
    .filter((g) => g.name.length > 0);
}

// ─── Stock Categories ─────────────────────────────────────────────────────────

export interface TallyStockCategory {
  name: string;
  parent: string;
}

export function parseStockCategories(xml: string): TallyStockCategory[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["STOCKCATEGORY"] as TallyObj | TallyObj[])
    .map((c): TallyStockCategory => ({
      name: name(c),
      parent: str(c["PARENT"]),
    }))
    .filter((c) => c.name.length > 0);
}

// ─── Stock Items ──────────────────────────────────────────────────────────────

export interface TallyStockItem {
  name: string;
  parent: string;
  category: string;
  base_units: string;
  gst_applicable: string;
  hsn_code: string;
  gst_type_of_supply: string;
  opening_balance: number;
  opening_value: number;
  opening_rate: number;
  closing_balance: number;
  closing_value: number;
}

export function parseStockItems(xml: string): TallyStockItem[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["STOCKITEM"] as TallyObj | TallyObj[])
    .map((s): TallyStockItem => ({
      name: name(s),
      parent: str(s["PARENT"]),
      category: str(s["CATEGORY"]),
      base_units: str(s["BASEUNITS"]),
      gst_applicable: str(s["GSTAPPLICABLE"]),
      hsn_code: str(s["HSNSACCODE"] ?? s["HSNCODE"]),
      gst_type_of_supply: str(s["GSTTYPEOFSUPPLY"]),
      opening_balance: num(s["OPENINGBALANCE"]),
      opening_value: num(s["OPENINGVALUE"]),
      opening_rate: num(s["OPENINGRATE"]),
      closing_balance: num(s["CLOSINGBALANCE"]),
      closing_value: num(s["CLOSINGVALUE"]),
    }))
    .filter((s) => s.name.length > 0);
}

// ─── Units of Measure ────────────────────────────────────────────────────────

export interface TallyUnit {
  name: string;
  symbol: string;
  formal_name: string;
  is_simple_unit: string;
}

export function parseUnits(xml: string): TallyUnit[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["UNIT"] as TallyObj | TallyObj[])
    .map((u): TallyUnit => ({
      name: name(u),
      symbol: str(u["NAME"] ?? u["@_NAME"]),
      formal_name: str(u["FORMALNAME"]),
      is_simple_unit: str(u["ISSIMPLEUNIT"]),
    }))
    .filter((u) => u.name.length > 0);
}

// ─── Godowns / Warehouses ────────────────────────────────────────────────────

export interface TallyGodown {
  name: string;
  parent: string;
  address: string;
  is_internal: string;
}

export function parseGodowns(xml: string): TallyGodown[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["GODOWN"] as TallyObj | TallyObj[])
    .map((g): TallyGodown => ({
      name: name(g),
      parent: str(g["PARENT"]),
      address: str(g["ADDRESS"]),
      is_internal: str(g["ISINTERNAL"]),
    }))
    .filter((g) => g.name.length > 0);
}

// ─── Cost Centres ────────────────────────────────────────────────────────────

export interface TallyCostCentre {
  name: string;
  parent: string;
  category: string;
}

export function parseCostCentres(xml: string): TallyCostCentre[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["COSTCENTRE"] as TallyObj | TallyObj[])
    .map((c): TallyCostCentre => ({
      name: name(c),
      parent: str(c["PARENT"]),
      category: str(c["CATEGORY"]),
    }))
    .filter((c) => c.name.length > 0);
}

// ─── Cost Categories ─────────────────────────────────────────────────────────

export interface TallyCostCategory {
  name: string;
  allocate_revenue: string;
  allocate_non_revenue: string;
}

export function parseCostCategories(xml: string): TallyCostCategory[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["COSTCATEGORY"] as TallyObj | TallyObj[])
    .map((c): TallyCostCategory => ({
      name: name(c),
      allocate_revenue: str(c["ALLOCATEREVENUE"]),
      allocate_non_revenue: str(c["ALLOCATENONREVENUE"]),
    }))
    .filter((c) => c.name.length > 0);
}

// ─── Voucher Types ───────────────────────────────────────────────────────────

export interface TallyVoucherType {
  name: string;
  parent: string;
  is_active: string;
  numbering_method: string;
}

export function parseVoucherTypes(xml: string): TallyVoucherType[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["VOUCHERTYPE"] as TallyObj | TallyObj[])
    .map((v): TallyVoucherType => ({
      name: name(v),
      parent: str(v["PARENT"]),
      is_active: str(v["ISACTIVE"]),
      numbering_method: str(v["NUMBERINGMETHOD"]),
    }))
    .filter((v) => v.name.length > 0);
}

// ─── Vouchers (Sales / Purchase / Payment / Receipt / Journal / etc.) ─────────

export interface TallyLedgerEntry {
  ledger_name: string;
  amount: number;
  is_party_ledger: boolean;
  bill_allocations: Array<{ name: string; bill_type: string; amount: number }>;
}

export interface TallyInventoryEntry {
  stock_item_name: string;
  quantity: number;
  rate: number;
  amount: number;
  unit: string;
  godown: string;
  batch: string;
}

export interface TallyVoucher {
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration: string;
  party_ledger: string;
  amount: number;
  is_cancelled: boolean;
  ledger_entries: TallyLedgerEntry[];
  inventory_entries: TallyInventoryEntry[];
}

export function parseVouchers(xml: string): TallyVoucher[] {
  const col = getCollection(xml);
  if (!col) return [];
  const vouchers = toArray(col["VOUCHER"] as TallyObj | TallyObj[]);

  return vouchers
    .map((v): TallyVoucher => {
      const ledgerEntries = toArray(
        v["ALLLEDGERENTRIES.LIST"] as TallyObj | TallyObj[]
      ).map((le) => ({
        ledger_name: str(le["LEDGERNAME"]),
        amount: num(le["AMOUNT"]),
        is_party_ledger: str(le["ISPARTYLEDGER"]).toLowerCase() === "yes",
        bill_allocations: toArray(
          le["BILLALLOCATIONS.LIST"] as TallyObj | TallyObj[]
        ).map((b) => ({
          name: str(b["NAME"]),
          bill_type: str(b["BILLTYPE"]),
          amount: num(b["AMOUNT"]),
        })),
      }));

      const inventoryEntries = toArray(
        v["INVENTORYENTRIES.LIST"] as TallyObj | TallyObj[]
      ).map((ie) => ({
        stock_item_name: str(ie["STOCKITEMNAME"]),
        quantity: num(ie["ACTUALQTY"] ?? ie["BILLEDQTY"]),
        rate: num(ie["RATE"]),
        amount: num(ie["AMOUNT"]),
        unit: str(ie["UNIT"] ?? ie["ACTUALUNIT"]),
        godown: str(ie["GODOWNNAME"]),
        batch: str(
          toArray(ie["BATCHALLOCATIONS.LIST"] as TallyObj | TallyObj[])[0]?.["BATCHNAME"]
        ),
      }));

      return {
        voucher_type: str(v["VOUCHERTYPENAME"]),
        voucher_number: str(v["VOUCHERNUMBER"]),
        date: str(v["DATE"]),
        narration: str(v["NARRATION"]),
        party_ledger: str(v["PARTYLEDGERNAME"]),
        amount: num(v["AMOUNT"]),
        is_cancelled: str(v["ISCANCELLED"]).toLowerCase() === "yes",
        ledger_entries: ledgerEntries,
        inventory_entries: inventoryEntries,
      };
    })
    .filter((v) => v.voucher_type.length > 0);
}

// ─── Batch / Serial numbers ───────────────────────────────────────────────────

export interface TallyBatch {
  name: string;
  stock_item: string;
  manufactured_on: string;
  expiry_on: string;
  opening_balance: number;
  opening_value: number;
}

export function parseBatchDetails(xml: string): TallyBatch[] {
  const col = getCollection(xml);
  if (!col) return [];
  return toArray(col["BATCH"] as TallyObj | TallyObj[])
    .map((b): TallyBatch => ({
      name: name(b),
      stock_item: str(b["STOCKITEM"]),
      manufactured_on: str(b["MFDON"]),
      expiry_on: str(b["EXPIRYON"]),
      opening_balance: num(b["OPENINGBALANCE"]),
      opening_value: num(b["OPENINGVALUE"]),
    }))
    .filter((b) => b.name.length > 0);
}

// ─── Reports (raw — server does the display) ──────────────────────────────────

export function parseReport(xml: string): unknown {
  return parser.parse(xml);
}
