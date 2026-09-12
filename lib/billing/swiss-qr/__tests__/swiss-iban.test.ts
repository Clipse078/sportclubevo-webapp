import { describe, expect, it } from "vitest";
import {
  assertSwissReferenceAccountCompatibility,
} from "../swiss-reference-compat";
import {
  extractSwissIid,
  isQrIban,
  normalizeSwissIban,
  validateChLiIbanShape,
} from "../swiss-iban";

/** Checksum-valid synthetic fixtures (no production account numbers). */
const NORMAL_IBAN_ENDS_X = "CH530076201162385295X";
const QR_IBAN_ENDS_X = "CH843004900000000000X";
const NORMAL_IBAN_NUMERIC = "CH9300762011623852957";
const QR_IBAN_NUMERIC = "CH0030049000000000049";

describe("validateChLiIbanShape (SIX CH/LI alphanumeric account)", () => {
  it("accepts valid CH IBAN whose 12-character account portion ends in X", () => {
    expect(validateChLiIbanShape(NORMAL_IBAN_ENDS_X)).toBe(NORMAL_IBAN_ENDS_X);
    expect(validateChLiIbanShape("ch53 0076 2011 6238 5295 x")).toBe(
      NORMAL_IBAN_ENDS_X,
    );
  });

  it("accepts valid CH QR-IBAN whose account portion ends in X", () => {
    expect(validateChLiIbanShape(QR_IBAN_ENDS_X)).toBe(QR_IBAN_ENDS_X);
    expect(isQrIban(QR_IBAN_ENDS_X)).toBe(true);
    expect(extractSwissIid(QR_IBAN_ENDS_X)).toBe(30049);
  });

  it("still accepts numeric-only account numbers", () => {
    expect(validateChLiIbanShape(NORMAL_IBAN_NUMERIC)).toBe(NORMAL_IBAN_NUMERIC);
    expect(validateChLiIbanShape(QR_IBAN_NUMERIC)).toBe(QR_IBAN_NUMERIC);
  });

  it("normalizes human-readable spacing and lowercase to uppercase", () => {
    const spaced = "CH93 0076 2011 6238 5295 7";
    expect(normalizeSwissIban(spaced)).toBe(NORMAL_IBAN_NUMERIC);
    expect(validateChLiIbanShape(spaced)).toBe(NORMAL_IBAN_NUMERIC);
  });

  it("requires exactly 21 characters after normalization", () => {
    expect(() => validateChLiIbanShape("CH930076201162385295")).toThrow(
      /CH\/LI-Format/,
    );
    expect(() => validateChLiIbanShape("CH93007620116238529577")).toThrow(
      /CH\/LI-Format/,
    );
  });

  it("requires numeric IID (positions 5–9) and rejects letters in IID", () => {
    expect(() => validateChLiIbanShape("CH93A762011623852957")).toThrow(
      /CH\/LI-Format/,
    );
  });

  it("rejects special characters in the account portion", () => {
    expect(() => validateChLiIbanShape("CH93007620116238529-7")).toThrow(
      /CH\/LI-Format/,
    );
  });

  it("rejects invalid Modulo-97 checksum", () => {
    expect(() => validateChLiIbanShape("CH9300762011623852958")).toThrow(
      /Prüfziffer/,
    );
  });

  it("enforces QR-IID range 30000–31999 for QR-IBAN detection", () => {
    expect(isQrIban(QR_IBAN_NUMERIC)).toBe(true);
    expect(isQrIban(NORMAL_IBAN_NUMERIC)).toBe(false);
    expect(isQrIban(NORMAL_IBAN_ENDS_X)).toBe(false);
  });

  it("allows QRR with QR-IBAN ending in X", () => {
    expect(() =>
      assertSwissReferenceAccountCompatibility({
        iban: NORMAL_IBAN_ENDS_X,
        qrIban: QR_IBAN_ENDS_X,
        referenceStrategy: "QRR",
      }),
    ).not.toThrow();
  });
});
