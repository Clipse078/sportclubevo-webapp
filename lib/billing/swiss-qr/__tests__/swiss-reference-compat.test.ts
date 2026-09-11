import { describe, expect, it } from "vitest";
import {
  assertSwissReferenceAccountCompatibility,
  SwissReferenceCompatError,
} from "../swiss-reference-compat";

const NORMAL_IBAN = "CH9300762011623852957";
const QR_IBAN = "CH0030049000000000049";

describe("swiss reference / account compatibility", () => {
  it("QR-IBAN + QRR passes", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: NORMAL_IBAN,
        qrIban: QR_IBAN,
        referenceStrategy: "QRR",
      }),
    ).not.toThrow();
  });

  it("normal IBAN + SCOR passes", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: NORMAL_IBAN,
        qrIban: null,
        referenceStrategy: "SCOR",
      }),
    ).not.toThrow();
  });

  it("normal IBAN + NON passes", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: NORMAL_IBAN,
        qrIban: null,
        referenceStrategy: "NON",
      }),
    ).not.toThrow();
  });

  it("normal IBAN + QRR fails without QR-IBAN", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: NORMAL_IBAN,
        qrIban: null,
        referenceStrategy: "QRR",
      }),
    ).toThrow(SwissReferenceCompatError);
  });

  it("QR-IBAN + SCOR fails", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: QR_IBAN,
        qrIban: null,
        referenceStrategy: "SCOR",
      }),
    ).toThrow(SwissReferenceCompatError);
  });

  it("QR-IBAN + NON fails", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: QR_IBAN,
        qrIban: null,
        referenceStrategy: "NON",
      }),
    ).toThrow(SwissReferenceCompatError);
  });
});
