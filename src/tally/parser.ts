import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

export interface TallyLedger {
  ledger_name: string;
  parent: string;
  opening_balance: number;
  gstin: string;
  mobile: string;
}

export function parseXML(xml: string) {
  return parser.parse(xml);
}

export function parseLedgers(xml: string): TallyLedger[] {
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const envelope = parsed["ENVELOPE"] as Record<string, unknown> | undefined;
  const body = envelope?.["BODY"] as Record<string, unknown> | undefined;
  const exportData = body?.["EXPORTDATA"] as Record<string, unknown> | undefined;
  const requestData = exportData?.["REQUESTDATA"] as Record<string, unknown> | undefined;
  const tallyMsg = requestData?.["TALLYMESSAGE"] as Record<string, unknown> | undefined;
  const collection = tallyMsg?.["COLLECTION"] as Record<string, unknown> | undefined;

  if (!collection) return [];

  const raw = collection["LEDGER"];
  if (!raw) return [];

  const ledgers = Array.isArray(raw) ? raw : [raw];

  return (ledgers as Record<string, unknown>[])
    .map((l) => {
      const gst = l["LEDGSTREGDETAILS.LIST"] as Record<string, unknown> | undefined;
      const rawBalance = String(l["OPENINGBALANCE"] ?? "0").trim().replace(/[^\d.-]/g, "");

      return {
        ledger_name: String(l["@_NAME"] ?? "").trim(),
        parent: String(l["PARENT"] ?? "").trim(),
        opening_balance: parseFloat(rawBalance) || 0,
        gstin: String(gst?.["GSTIN"] ?? "").trim(),
        mobile: String(l["LEDMOBNO"] ?? "").trim(),
      };
    })
    .filter((l) => l.ledger_name.length > 0);
}
