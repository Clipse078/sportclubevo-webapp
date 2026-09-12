import { XMLParser } from "fast-xml-parser";
import type { Camt054CreditTransaction, Camt054ParseResult } from "./camt054-types";

export class Camt054ParseError extends Error {
  readonly name = "Camt054ParseError";
}

const CAMT054_NAMESPACE_SUFFIX = "camt.054";

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim();
  }
  if (typeof node === "object" && node !== null && "#text" in node) {
    const text = (node as { "#text"?: string | number })["#text"];
    return text != null ? String(text).trim() : null;
  }
  return null;
}

function readAmountMinor(amtNode: unknown): { currency: string; amountMinor: number } | null {
  if (amtNode == null) return null;
  if (typeof amtNode === "object" && amtNode !== null) {
    const record = amtNode as Record<string, unknown>;
    const currency = String(record["@_Ccy"] ?? record.Ccy ?? "CHF").trim().toUpperCase();
    const raw = readText(record) ?? readText(record.Amt) ?? readText(record["#text"]);
    if (!raw) return null;
    const normalized = raw.replace(",", ".");
    const major = Number(normalized);
    if (!Number.isFinite(major)) return null;
    return { currency, amountMinor: Math.round(major * 100) };
  }
  const major = Number(String(amtNode).replace(",", "."));
  if (!Number.isFinite(major)) return null;
  return { currency: "CHF", amountMinor: Math.round(major * 100) };
}

function extractReferenceType(cdtrRefInf: unknown): "QRR" | "SCOR" | "UNKNOWN" {
  if (!cdtrRefInf || typeof cdtrRefInf !== "object") return "UNKNOWN";
  const tp = (cdtrRefInf as Record<string, unknown>).Tp;
  if (!tp || typeof tp !== "object") return "UNKNOWN";
  const cdOrPrtry = (tp as Record<string, unknown>).CdOrPrtry;
  if (!cdOrPrtry || typeof cdOrPrtry !== "object") return "UNKNOWN";
  const prtry = readText((cdOrPrtry as Record<string, unknown>).Prtry);
  if (prtry?.toUpperCase() === "QRR") return "QRR";
  if (prtry?.toUpperCase() === "SCOR") return "SCOR";
  return "UNKNOWN";
}

function extractCreditorReference(rmtInf: unknown): {
  reference: string | null;
  referenceType: "QRR" | "SCOR" | "UNKNOWN";
  rejected: boolean;
} {
  const structured = asArray(
    (rmtInf as Record<string, unknown> | undefined)?.Strd,
  );
  let reference: string | null = null;
  let referenceType: "QRR" | "SCOR" | "UNKNOWN" = "UNKNOWN";
  let rejected = false;

  for (const strd of structured) {
    if (!strd || typeof strd !== "object") continue;
    const record = strd as Record<string, unknown>;
    const cdtrRefInf = record.CdtrRefInf;
    if (cdtrRefInf) {
      const ref = readText((cdtrRefInf as Record<string, unknown>).Ref);
      if (ref) {
        reference = ref.replace(/\s+/g, "");
        referenceType = extractReferenceType(cdtrRefInf);
      }
    }
    for (const addtl of asArray(record.AddtlRmtInf)) {
      const text = readText(addtl);
      if (text?.includes("?REJECT?")) {
        rejected = true;
      }
    }
  }

  return { reference, referenceType, rejected };
}

function extractBookingDate(ntry: Record<string, unknown>): string | null {
  const bookg =
    readText(ntry.BookgDt) ??
    readText((ntry.BookgDt as Record<string, unknown> | undefined)?.Dt) ??
    readText((ntry.ValDt as Record<string, unknown> | undefined)?.Dt);
  if (!bookg) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(bookg);
  return match ? match[1] : null;
}

function buildFallbackTransactionId(parts: string[]): string {
  return parts.filter(Boolean).join("|");
}

function parseTransactionDetail(input: {
  tx: Record<string, unknown>;
  entry: Record<string, unknown>;
  messageId: string | null;
  index: number;
}): Camt054CreditTransaction | null {
  const cdtDbt = readText(input.tx.CdtDbtInd) ?? readText(input.entry.CdtDbtInd);
  if (!cdtDbt || cdtDbt.toUpperCase() !== "CRDT") {
    return null;
  }

  const amount =
    readAmountMinor(input.tx.Amt) ?? readAmountMinor(input.entry.Amt);
  if (!amount || amount.amountMinor <= 0) {
    return null;
  }

  const paymentDate = extractBookingDate(input.entry);
  if (!paymentDate) {
    return null;
  }

  const refs = input.tx.Refs as Record<string, unknown> | undefined;
  const acctSvcrRef = refs ? readText(refs.AcctSvcrRef) : null;
  const endToEndId = refs ? readText(refs.EndToEndId) : null;
  const bankTransactionId = buildFallbackTransactionId([
    input.messageId ?? "camt054",
    acctSvcrRef ?? endToEndId ?? readText(input.entry.NtryRef) ?? `idx-${input.index}`,
    paymentDate,
    String(amount.amountMinor),
  ]);

  const { reference, referenceType, rejected } = extractCreditorReference(
    input.tx.RmtInf,
  );

  let debtorName: string | null = null;
  const rltdPties = input.tx.RltdPties as Record<string, unknown> | undefined;
  if (rltdPties?.Dbtr && typeof rltdPties.Dbtr === "object") {
    debtorName = readText((rltdPties.Dbtr as Record<string, unknown>).Nm);
  }

  return {
    bankTransactionId,
    amountMinor: amount.amountMinor,
    currency: amount.currency,
    paymentDate,
    creditorReference: reference,
    referenceType,
    rejected,
    messageId: input.messageId,
    debtorName,
  };
}

function assertCamt054Document(root: Record<string, unknown>): void {
  const document = root.Document ?? root;
  if (!document || typeof document !== "object") {
    throw new Camt054ParseError("Ungültiges camt.054 Dokument.");
  }
  const xmlns = String((document as Record<string, unknown>)["@_xmlns"] ?? "");
  if (xmlns && !xmlns.includes(CAMT054_NAMESPACE_SUFFIX)) {
    throw new Camt054ParseError("XML ist kein camt.054 Dokument.");
  }
}

/**
 * Parses Swiss camt.054 credit notification XML (v04/v08) into normalized credit transactions.
 */
export function parseCamt054Xml(xml: string): Camt054ParseResult {
  const trimmed = xml.trim();
  if (!trimmed) {
    throw new Camt054ParseError("Leere camt.054 Datei.");
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(trimmed);
  } catch {
    throw new Camt054ParseError("camt.054 XML konnte nicht gelesen werden.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Camt054ParseError("Ungültiges camt.054 Dokument.");
  }

  const root = parsed as Record<string, unknown>;
  assertCamt054Document(root);

  const document = (root.Document ?? root) as Record<string, unknown>;
  const notification =
    (document.BkToCstmrDbtCdtNtfctn as Record<string, unknown> | undefined) ??
    (document.BkToCstmrStmt as Record<string, unknown> | undefined);
  if (!notification) {
    throw new Camt054ParseError("camt.054 enthält keine Buchungsavis.");
  }

  const messageId = readText(
    (notification.GrpHdr as Record<string, unknown> | undefined)?.MsgId,
  );

  const transactions: Camt054CreditTransaction[] = [];
  let index = 0;

  for (const ntfctn of asArray(notification.Ntfctn)) {
    if (!ntfctn || typeof ntfctn !== "object") continue;
    for (const ntry of asArray((ntfctn as Record<string, unknown>).Ntry)) {
      if (!ntry || typeof ntry !== "object") continue;
      const entry = ntry as Record<string, unknown>;
      const details = asArray(entry.NtryDtls);
      if (details.length === 0) {
        const pseudoTx = parseTransactionDetail({
          tx: entry,
          entry,
          messageId,
          index,
        });
        if (pseudoTx) transactions.push(pseudoTx);
        index += 1;
        continue;
      }
      for (const detail of details) {
        if (!detail || typeof detail !== "object") continue;
        for (const tx of asArray((detail as Record<string, unknown>).TxDtls)) {
          if (!tx || typeof tx !== "object") continue;
          const parsedTx = parseTransactionDetail({
            tx: tx as Record<string, unknown>,
            entry,
            messageId,
            index,
          });
          if (parsedTx) transactions.push(parsedTx);
          index += 1;
        }
      }
    }
  }

  return { messageId, transactions };
}
