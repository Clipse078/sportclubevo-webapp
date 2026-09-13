import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
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
  const code = readText((cdOrPrtry as Record<string, unknown>).Cd);
  if (prtry?.toUpperCase() === "QRR") return "QRR";
  if (prtry?.toUpperCase() === "SCOR") return "SCOR";
  if (code?.toUpperCase() === "SCOR") return "SCOR";
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

function extractDate(node: unknown): string | null {
  const record =
    node && typeof node === "object"
      ? (node as Record<string, unknown>)
      : undefined;
  const value =
    readText(node) ?? readText(record?.Dt) ?? readText(record?.DtTm);
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

function hashIdentity(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function maskAccount(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "");
  return compact.length <= 8
    ? `****${compact.slice(-4)}`
    : `${compact.slice(0, 4)}••••${compact.slice(-4)}`;
}

function extractAccountId(notification: Record<string, unknown>): string | null {
  const account = notification.Acct as Record<string, unknown> | undefined;
  const id = account?.Id as Record<string, unknown> | undefined;
  return readText(id?.IBAN) ?? readText(id?.Othr && (id.Othr as Record<string, unknown>).Id);
}

function extractTransactionAmount(
  tx: Record<string, unknown>,
  entry: Record<string, unknown>,
) {
  const details = tx.AmtDtls as Record<string, unknown> | undefined;
  const txAmount = details?.TxAmt as Record<string, unknown> | undefined;
  const instructed = details?.InstdAmt as Record<string, unknown> | undefined;
  return (
    readAmountMinor(tx.Amt) ??
    readAmountMinor(txAmount?.Amt) ??
    readAmountMinor(instructed?.Amt) ??
    readAmountMinor(entry.Amt)
  );
}

function parseTransactionDetail(input: {
  tx: Record<string, unknown>;
  entry: Record<string, unknown>;
  messageId: string | null;
  accountId: string | null;
  index: number;
}): Camt054CreditTransaction | null {
  const cdtDbt = readText(input.tx.CdtDbtInd) ?? readText(input.entry.CdtDbtInd);
  const reversal =
    cdtDbt?.toUpperCase() === "DBIT" ||
    readText(input.tx.RvslInd)?.toLowerCase() === "true" ||
    readText(input.entry.RvslInd)?.toLowerCase() === "true";
  if (!cdtDbt || (!reversal && cdtDbt.toUpperCase() !== "CRDT")) {
    return null;
  }

  const amount = extractTransactionAmount(input.tx, input.entry);
  if (!amount || amount.amountMinor <= 0) {
    return null;
  }

  const bookingDate = extractDate(input.entry.BookgDt);
  const valueDate = extractDate(input.entry.ValDt);
  const paymentDate = bookingDate ?? valueDate;
  if (!paymentDate) {
    return null;
  }

  const refs = input.tx.Refs as Record<string, unknown> | undefined;
  const acctSvcrRef = refs ? readText(refs.AcctSvcrRef) : null;
  const endToEndId = refs ? readText(refs.EndToEndId) : null;
  const { reference, referenceType, rejected } = extractCreditorReference(
    input.tx.RmtInf,
  );
  const providerReference =
    acctSvcrRef ?? endToEndId ?? readText(input.entry.NtryRef);
  const fallback = [
    input.accountId ?? "unknown-account",
    paymentDate,
    String(amount.amountMinor),
    amount.currency,
    reference ?? "",
    reversal ? "reversal" : "credit",
  ].join("|");
  const bankTransactionId = `CAMT054:${hashIdentity(input.accountId ?? "unknown-account")}:${
    providerReference ? hashIdentity(providerReference) : hashIdentity(fallback)
  }`;

  let debtorName: string | null = null;
  const rltdPties = input.tx.RltdPties as Record<string, unknown> | undefined;
  if (rltdPties?.Dbtr && typeof rltdPties.Dbtr === "object") {
    const debtor = rltdPties.Dbtr as Record<string, unknown>;
    const party = debtor.Pty as Record<string, unknown> | undefined;
    debtorName = readText(debtor.Nm) ?? readText(party?.Nm);
  }

  return {
    bankTransactionId,
    accountServiceReference: acctSvcrRef,
    endToEndId,
    amountMinor: amount.amountMinor,
    currency: amount.currency,
    paymentDate,
    bookingDate: paymentDate,
    valueDate,
    creditorReference: reference,
    referenceType,
    rejected,
    reversal,
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
  if (/<!DOCTYPE|<!ENTITY/i.test(trimmed)) {
    throw new Camt054ParseError("Unsichere XML-Deklaration ist nicht erlaubt.");
  }
  if (XMLValidator.validate(trimmed) !== true) {
    throw new Camt054ParseError("camt.054 XML konnte nicht gelesen werden.");
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
  let accountId: string | null = null;
  let index = 0;

  for (const ntfctn of asArray(notification.Ntfctn)) {
    if (!ntfctn || typeof ntfctn !== "object") continue;
    const notificationRecord = ntfctn as Record<string, unknown>;
    const notificationAccountId = extractAccountId(notificationRecord);
    accountId ??= notificationAccountId;
    for (const ntry of asArray(notificationRecord.Ntry)) {
      if (!ntry || typeof ntry !== "object") continue;
      const entry = ntry as Record<string, unknown>;
      const details = asArray(entry.NtryDtls);
      if (details.length === 0) {
        const pseudoTx = parseTransactionDetail({
          tx: entry,
          entry,
          messageId,
          accountId: notificationAccountId,
          index,
        });
        if (pseudoTx) transactions.push(pseudoTx);
        index += 1;
        continue;
      }
      for (const detail of details) {
        if (!detail || typeof detail !== "object") continue;
        const detailRecord = detail as Record<string, unknown>;
        const batch = detailRecord.Btch as Record<string, unknown> | undefined;
        const transactionDetails = [
          ...asArray(detailRecord.TxDtls),
          ...asArray(batch?.TxDtls),
        ];
        for (const tx of transactionDetails) {
          if (!tx || typeof tx !== "object") continue;
          const parsedTx = parseTransactionDetail({
            tx: tx as Record<string, unknown>,
            entry,
            messageId,
            accountId: notificationAccountId,
            index,
          });
          if (parsedTx) transactions.push(parsedTx);
          index += 1;
        }
      }
    }
  }

  const credits = transactions.filter((transaction) => !transaction.reversal);
  const currencies = new Set(credits.map((transaction) => transaction.currency));
  const dates = transactions.map((transaction) => transaction.bookingDate).sort();
  return {
    messageId,
    accountIdentification: accountId,
    accountIdentificationMasked: maskAccount(accountId),
    bookingPeriodStart: dates[0] ?? null,
    bookingPeriodEnd: dates.at(-1) ?? null,
    totalCreditsMinor: credits.reduce(
      (total, transaction) => total + transaction.amountMinor,
      0,
    ),
    creditCurrency: currencies.size === 1 ? [...currencies][0]! : null,
    transactions,
  };
}
