import { describe, expect, it } from "vitest";

import {
  TENANT_DOCUMENTATION_PREVIEW_ORIGIN,
  buildTenantDocumentationHandoffUrls,
  buildTenantDocumentationPreviewUrl,
} from "../sce-tenant-documentation-handoff";

describe("PR #1025 tenant documentation handoff URLs", () => {
  it("builds commit-bound Dokumentation hub and page URLs", () => {
    const sha = "c9756df3375fe9cccf3fbdaedc59f5ca306ee7f6";
    const hub = buildTenantDocumentationPreviewUrl(
      TENANT_DOCUMENTATION_PREVIEW_ORIGIN,
      sha,
    );
    expect(hub).toBe(
      `${TENANT_DOCUMENTATION_PREVIEW_ORIGIN}/dashboard/dokumentation?dpl=c9756df3375f`,
    );

    const handoff = buildTenantDocumentationHandoffUrls(
      TENANT_DOCUMENTATION_PREVIEW_ORIGIN,
      sha,
      "page-sample-123",
    );
    expect(handoff.samplePage).toBe(
      `${TENANT_DOCUMENTATION_PREVIEW_ORIGIN}/dashboard/dokumentation/p/page-sample-123?dpl=c9756df3375f`,
    );
  });
});