import { describe, expect, it } from "vitest";
import { parseInfoboardPreviewDisplayTheme } from "@/lib/infoboard/preview-display-theme";

describe("parseInfoboardPreviewDisplayTheme", () => {
  it("uses the query value when valid", () => {
    expect(parseInfoboardPreviewDisplayTheme("LIGHT", "DARK")).toBe("LIGHT");
    expect(parseInfoboardPreviewDisplayTheme("dark", null)).toBe("DARK");
  });

  it("falls back to board/tenant raw when query is absent", () => {
    expect(parseInfoboardPreviewDisplayTheme(undefined, "LIGHT")).toBe("LIGHT");
    expect(parseInfoboardPreviewDisplayTheme(undefined, null)).toBe("DARK");
  });
});
