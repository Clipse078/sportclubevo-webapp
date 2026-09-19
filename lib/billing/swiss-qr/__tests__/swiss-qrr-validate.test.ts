import { describe, expect, it } from "vitest";
import { validateQrrReference } from "../swiss-qrr";
import { swissModulo10CheckDigit } from "../swiss-modulo10";

describe("validateQrrReference", () => {
  it("accepts a valid 27-digit QRR", () => {
    const body = "27328202600000202543465007";
    const ref = `${body}${swissModulo10CheckDigit(body)}`;
    expect(validateQrrReference(ref)).toBe(ref);
  });

  it("rejects invalid checksum", () => {
    expect(() => validateQrrReference("210000000003139471430009018")).toThrow();
  });
});
