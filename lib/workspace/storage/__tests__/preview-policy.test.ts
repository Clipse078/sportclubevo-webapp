import { describe, expect, it } from "vitest";

import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";

describe("preview-policy", () => {
  it("W04-28 allows PDF preview", () => {
    expect(isWorkspaceInlinePreviewSupported("application/pdf")).toBe(true);
  });

  it("W04-29 allows safe raster images", () => {
    expect(isWorkspaceInlinePreviewSupported("image/png")).toBe(true);
    expect(isWorkspaceInlinePreviewSupported("image/jpeg")).toBe(true);
  });

  it("W04-25 blocks HTML inline preview", () => {
    expect(isWorkspaceInlinePreviewSupported("text/html")).toBe(false);
  });

  it("W04-26 blocks SVG inline preview", () => {
    expect(isWorkspaceInlinePreviewSupported("image/svg+xml")).toBe(false);
  });

  it("W04-27 blocks unknown binary preview", () => {
    expect(
      isWorkspaceInlinePreviewSupported("application/octet-stream"),
    ).toBe(false);
  });
});
