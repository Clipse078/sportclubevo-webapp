import { describe, expect, it } from "vitest";
import { resolveLightInlineWelcome } from "@/lib/infoboard/light-header-welcome";

describe("resolveLightInlineWelcome", () => {
  it("derives compact welcome from long configured sportanlage subtitle", () => {
    expect(
      resolveLightInlineWelcome(
        "HERZLICH WILLKOMMEN AUF DER SPORTANLAGE IM BRÜEL",
      ),
    ).toBe("Willkommen im Brüel");
  });

  it("preserves short configured welcome without forced derivation", () => {
    expect(resolveLightInlineWelcome("Willkommen auf der Anlage")).toBe(
      "Willkommen auf der Anlage",
    );
  });
});
