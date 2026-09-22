import { describe, expect, it } from "vitest";

import {
  compareWorkspaceDocumentVersionOrder,
  formatRestoreProvenanceChangeNote,
  parseRestoredFromVersionId,
  deriveWorkspaceVersionIsCurrent,
} from "@/lib/workspace/version/version-domain";
import { toWorkspaceDocumentVersionRefDto } from "@/lib/workspace/version/version-reference";

describe("version-domain", () => {
  it("orders versions deterministically by number then time then id", () => {
    const left = {
      versionNumber: 2,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      id: "b",
    };
    const right = {
      versionNumber: 3,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "a",
    };

    expect(compareWorkspaceDocumentVersionOrder(left, right)).toBeGreaterThan(
      0,
    );
  });

  it("round-trips restore provenance in changeNote", () => {
    const note = formatRestoreProvenanceChangeNote("ver-old", "User note");
    expect(parseRestoredFromVersionId(note)).toBe("ver-old");
  });

  it("derives current flag from document pointer only", () => {
    expect(deriveWorkspaceVersionIsCurrent("v2", "v2")).toBe(true);
    expect(deriveWorkspaceVersionIsCurrent("v2", "v1")).toBe(false);
  });

  it("builds immutable version reference dto without latest resolution", () => {
    expect(
      toWorkspaceDocumentVersionRefDto({
        tenantId: " tenant ",
        documentId: "doc",
        versionId: "ver",
      }),
    ).toEqual({
      tenantId: "tenant",
      documentId: "doc",
      versionId: "ver",
    });
  });
});
