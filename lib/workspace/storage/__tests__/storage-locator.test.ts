import { describe, expect, it } from "vitest";

import {
  isAllowedWorkspaceStorageReference,
  isLegacyWorkspaceStorageKey,
  isSecureTenantScopedStorageKey,
} from "@/lib/workspace/storage/storage-locator";

describe("storage-locator", () => {
  it("W04-39 accepts secure tenant-scoped keys", () => {
    const key =
      "workspace/tenants/tenant-1/documents/doc-1/versions/ver-1/file.pdf";
    expect(isSecureTenantScopedStorageKey(key)).toBe(true);
    expect(isAllowedWorkspaceStorageReference(key)).toBe(true);
    expect(isLegacyWorkspaceStorageKey(key)).toBe(false);
  });

  it("W04-40 allows legacy keys for authorized reads", () => {
    const legacy = "workspace/fc-allschwil/document-1/v1/file.pdf";
    expect(isLegacyWorkspaceStorageKey(legacy)).toBe(true);
    expect(isAllowedWorkspaceStorageReference(legacy)).toBe(true);
  });

  it("W04-11 rejects raw external URLs as storage references", () => {
    expect(
      isAllowedWorkspaceStorageReference(
        "https://attacker.example/blob/file.pdf",
      ),
    ).toBe(false);
  });

  it("W04-22 rejects path traversal segments", () => {
    expect(
      isAllowedWorkspaceStorageReference("workspace/../secrets/file.pdf"),
    ).toBe(false);
  });
});
