import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCamt054Xml } from "../parse-camt054-xml";

const fixturePath = path.join(
  import.meta.dirname,
  "fixtures",
  "sample-credit-qrr.camt054.xml",
);
const ubsFixturePath = path.join(
  import.meta.dirname,
  "fixtures",
  "ubs-iso-v8-sps22.camt054.xml",
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
    expect(result.transactions[0].bankTransactionId).toMatch(
      /^CAMT054:[a-f0-9]{24}:[a-f0-9]{24}$/,
    );
  });

  it("exposes debit entries as reversals requiring downstream review", () => {
    const xml = readFileSync(fixturePath, "utf8").replaceAll(
      "<CdtDbtInd>CRDT</CdtDbtInd>",
      "<CdtDbtInd>DBIT</CdtDbtInd>",
    );
    const result = parseCamt054Xml(xml);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].reversal).toBe(true);
  });

  it("supports UBS ISO V8 / SPS 2.2 batch details and stable provider identity", () => {
    const xml = readFileSync(ubsFixturePath, "utf8");
    const result = parseCamt054Xml(xml);

    expect(result).toMatchObject({
      messageId: "UBS-SYNTHETIC-SPS22-001",
      accountIdentificationMasked: "CH44••••5678",
      bookingPeriodStart: "2026-09-12",
      bookingPeriodEnd: "2026-09-13",
      totalCreditsMinor: 21512,
      creditCurrency: "CHF",
    });
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      accountServiceReference: "UBS-ASR-SYNTHETIC-0001",
      endToEndId: "NOTPROVIDED",
      valueDate: "2026-09-13",
      debtorName: "Example Sports Club",
      referenceType: "QRR",
      reversal: false,
    });
    expect(result.transactions[1]).toMatchObject({
      accountServiceReference: "UBS-ASR-SYNTHETIC-REV-1",
      reversal: true,
    });
  });

  it("rejects documents with a DOCTYPE or entity declaration", () => {
    expect(() =>
      parseCamt054Xml(
        `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><Document>&xxe;</Document>`,
      ),
    ).toThrow(/Unsichere XML-Deklaration/);
  });

  it("rejects malformed XML", () => {
    expect(() => parseCamt054Xml("<Document><broken></Document>")).toThrow(
      /konnte nicht gelesen/,
    );
  });
});
