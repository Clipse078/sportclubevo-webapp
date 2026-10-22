import { describe, expect, it } from "vitest";
import { resolveFinanceFormattingLocale } from "@/lib/finance/presentation/resolve-finance-formatting-locale";
import { PLATFORM_FORMATTING_LOCALE } from "@/lib/tenant-runtime/formatters";

describe("resolveFinanceFormattingLocale", () => {
  it("uses tenant locale when configured", () => {
    expect(resolveFinanceFormattingLocale({ locale: "de-CH" })).toBe("de-CH");
  });

  it("falls back to platform formatting locale without coupling currency", () => {
    expect(resolveFinanceFormattingLocale({ locale: null })).toBe(PLATFORM_FORMATTING_LOCALE);
    expect(resolveFinanceFormattingLocale({ locale: "  " })).toBe(PLATFORM_FORMATTING_LOCALE);
  });
});
