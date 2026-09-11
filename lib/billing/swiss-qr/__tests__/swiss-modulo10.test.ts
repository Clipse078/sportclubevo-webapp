import { describe, expect, it } from "vitest";
import {
  appendModulo10CheckDigit,
  swissModulo10CheckDigit,
  SwissModulo10Error,
} from "../swiss-modulo10";

describe("swiss modulo-10 recursive", () => {
  it("matches SIX annex B example payload (26 digits → check digit 7)", () => {
    expect(swissModulo10CheckDigit("21000000000313947143000901")).toBe("7");
  });

  it("rejects non-numeric input", () => {
    expect(() => swissModulo10CheckDigit("12A")).toThrow(SwissModulo10Error);
  });

  it("rejects empty input", () => {
    expect(() => swissModulo10CheckDigit("")).toThrow(SwissModulo10Error);
  });

  it("produces 27-digit QRR when appending check digit", () => {
    const body = "21000000000313947143000901";
    const full = appendModulo10CheckDigit(body);
    expect(full).toHaveLength(27);
    expect(full).toBe(`${body}7`);
  });
});
