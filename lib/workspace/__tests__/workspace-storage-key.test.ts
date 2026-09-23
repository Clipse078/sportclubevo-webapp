import { describe, expect, it } from "vitest";

import {
  getWorkspaceStorageKey,
  isTenantSafeWorkspaceStorageKey,
  parseSecureWorkspaceStorageKeyParts,
} from "@/lib/workspace/storage/workspace-storage-key";

describe("workspace storage keys (W08-06)", () => {
  it("generates tenant-scoped opaque keys", () => {
    const key = getWorkspaceStorageKey({
      tenantId: "Tenant_ABC",
      documentId: "doc-1",
      versionId: "ver-1",
      filename: "../../secret.pdf",
    });
    expect(key).toMatch(/^workspace\/tenants\/tenant_abc\/documents\//);
    expect(key).not.toContain("..");
  });

  it("tenant A cannot use tenant B prefix", () => {
    const key = getWorkspaceStorageKey({
      tenantId: "tenant-a",
      documentId: "d",
      versionId: "v",
      filename: "f.pdf",
    });
    expect(
      isTenantSafeWorkspaceStorageKey({
        tenantId: "tenant-b",
        storageKey: key,
      }),
    ).toBe(false);
  });

  it("parses secure key segments", () => {
    const key = getWorkspaceStorageKey({
      tenantId: "t1",
      documentId: "d1",
      versionId: "v1",
      filename: "x.pdf",
    });
    expect(parseSecureWorkspaceStorageKeyParts(key)?.tenantSegment).toBe("t1");
  });
});
