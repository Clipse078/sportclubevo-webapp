import { describe, expect, it } from "vitest";
import {
  FINANCE_MONEY_ISO_SUFFIX_SEPARATOR,
  formatFinanceMoneyMinor,
  formatFinanceMoneyWholeMajorNumber,
  getFinanceMoneyPresentationFormatters,
} from "@/lib/finance/presentation/finance-money-presentation";

function expectedWholeMajorNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

describe("FIN-01E R5 finance money presentation", () => {
  describe("locale and currency independence", () => {
    it("de-CH + CHF uses Swiss grouping and explicit CHF suffix", () => {
      expect(formatFinanceMoneyMinor(100_000, "CHF", "de-CH")).toBe(
        `${expectedWholeMajorNumber(1000, "de-CH")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`,
      );
    });

    it("de-CH + USD keeps Swiss grouping with USD code", () => {
      const formatted = formatFinanceMoneyMinor(100_000, "USD", "de-CH");
      expect(formatted.endsWith(`${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}USD`)).toBe(true);
      expect(formatted.startsWith(expectedWholeMajorNumber(1000, "de-CH"))).toBe(true);
    });

    it("en-US + USD uses US grouping", () => {
      expect(formatFinanceMoneyMinor(100_000, "USD", "en-US")).toBe(
        `${expectedWholeMajorNumber(1000, "en-US")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}USD`,
      );
    });

    it("en-US + CHF uses US grouping with CHF code", () => {
      expect(formatFinanceMoneyMinor(100_000, "CHF", "en-US")).toBe(
        `${expectedWholeMajorNumber(1000, "en-US")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`,
      );
    });

    it("de-DE + EUR uses German grouping", () => {
      expect(formatFinanceMoneyMinor(100_000, "EUR", "de-DE")).toBe(
        `${expectedWholeMajorNumber(1000, "de-DE")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}EUR`,
      );
    });

    it("de-DE + CHF uses German grouping with CHF code", () => {
      expect(formatFinanceMoneyMinor(100_000, "CHF", "de-DE")).toBe(
        `${expectedWholeMajorNumber(1000, "de-DE")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`,
      );
    });
  });

  it("groups large values consistently per locale", () => {
    const minor = 123_456_700;
    const deCh = formatFinanceMoneyMinor(minor, "CHF", "de-CH");
    expect(deCh).toBe(
      `${expectedWholeMajorNumber(1_234_567, "de-CH")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`,
    );
    const enUs = formatFinanceMoneyMinor(minor, "CHF", "en-US");
    expect(enUs).toBe(
      `${expectedWholeMajorNumber(1_234_567, "en-US")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`,
    );
  });

  it("formats whole major amounts without trailing fraction digits", () => {
    const value = formatFinanceMoneyMinor(150_000_000, "CHF", "de-CH");
    expect(value).not.toMatch(/[.,]00/);
    expect(value).toContain("CHF");
  });

  it("retains meaningful fractional minor units using ISO fraction digits", () => {
    const jpyDigits =
      new Intl.NumberFormat("en", { style: "currency", currency: "CHF" }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    const formatted = formatFinanceMoneyMinor(125_050, "CHF", "de-CH");
    const major = 1250.5;
    const expectedNumber = new Intl.NumberFormat("de-CH", {
      minimumFractionDigits: jpyDigits,
      maximumFractionDigits: jpyDigits,
    }).format(major);
    expect(formatted).toBe(`${expectedNumber}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`);
  });

  it("handles zero safely", () => {
    expect(formatFinanceMoneyMinor(0, "CHF", "de-CH")).toBe(
      `${expectedWholeMajorNumber(0, "de-CH")}${FINANCE_MONEY_ISO_SUFFIX_SEPARATOR}CHF`,
    );
  });

  it("formats negative amounts when present", () => {
    const formatted = formatFinanceMoneyMinor(-100_000, "CHF", "de-CH");
    expect(formatted).toContain("CHF");
    expect(formatted).toContain(expectedWholeMajorNumber(-1000, "de-CH"));
  });

  it("omits invalid currency codes without NaN leakage", () => {
    expect(formatFinanceMoneyMinor(100_000, "12", "de-CH")).toBe(
      expectedWholeMajorNumber(1000, "de-CH"),
    );
    expect(formatFinanceMoneyMinor(Number.NaN, "CHF", "de-CH")).toBe("");
  });

  it("formats whole-major row numbers without currency", () => {
    expect(formatFinanceMoneyWholeMajorNumber(10_000_000, "de-DE")).toBe("100.000");
    expect(formatFinanceMoneyWholeMajorNumber(10_000_000, "en-US")).toBe("100,000");
  });

  it("reuses memoized Intl formatters", () => {
    const first = getFinanceMoneyPresentationFormatters("EUR", "de-DE");
    const second = getFinanceMoneyPresentationFormatters("EUR", "de-DE");
    expect(first).toBe(second);
    expect(first.wholeMajorNumber).toBe(second.wholeMajorNumber);
  });
});
