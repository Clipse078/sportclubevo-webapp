import { describe, expect, it } from "vitest";
import { buildSwissSpcPayload } from "../swiss-spc-payload";

const creditor = {
  name: "Creditor AG",
  street: "Bahnhofstrasse",
  houseNumber: "1",
  postalCode: "4000",
  city: "Basel",
  countryCode: "CH",
};

const debtor = {
  name: "Debtor GmbH",
  street: "Musterweg",
  houseNumber: "9",
  postalCode: "4144",
  city: "Arlesheim",
  countryCode: "CH",
};

describe("swiss SPC payload builder", () => {
  it("builds standards-compliant payload with EPD trailer", () => {
    const payload = buildSwissSpcPayload({
      creditorAccount: "CH9300762011623852957",
      creditor,
      amountMinor: 19950,
      currency: "CHF",
      debtor,
      referenceType: "QRR",
      reference: "210000000003139471430009017",
      additionalInformation: "Rechnung 2026-000001",
    });

    expect(payload.startsWith("SPC\r\n0200\r\n1\r\n")).toBe(true);
    expect(payload.endsWith("\r\nEPD")).toBe(true);
    expect(payload).toContain("CH9300762011623852957");
    expect(payload).toContain("199.50");
    expect(payload).toContain("CHF");
    expect(payload).toContain("Creditor AG");
    expect(payload).toContain("Debtor GmbH");
    expect(payload).toContain("QRR");
    expect(payload).toContain("210000000003139471430009017");
    expect(payload).toContain("Rechnung 2026-000001");
  });
});
