import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCamt054Xml } from "../parse-camt054-xml";

const fixturePath = path.join(
  import.meta.dirname,
  "fixtures",
  "sample-credit-qrr.camt054.xml",
);

describe("parseCamt054Xml (SWISS-01H)", () => {
  it("extracts credit transactions with QRR reference", () => {
    const xml = readFileSync(fixturePath, "utf8");
    const result = parseCamt054Xml(xml);

    expect(result.messageId).toBe("CAMT054-TEST-MSG-001");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      amountMinor: 21512,
      currency: "CHF",
      paymentDate: "2026-09-12",
      creditorReference: "273282026000002025434650072",
      referenceType: "QRR",
      rejected: false,
    });
    expect(result.transactions[0].bankTransactionId).toContain("BANK-TX-SCE-01H-001");
  });

  it("ignores debit entries", () => {
    const xml = readFileSync(fixturePath, "utf8").replaceAll(
      "<CdtDbtInd>CRDT</CdtDbtInd>",
      "<CdtDbtInd>DBIT</CdtDbtInd>",
    );
    const result = parseCamt054Xml(xml);
    expect(result.transactions).toHaveLength(0);
  });
});
