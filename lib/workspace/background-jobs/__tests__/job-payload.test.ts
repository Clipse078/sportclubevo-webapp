import { WorkspaceBackgroundJobType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertWorkspaceBackgroundJobPayloadSafeForPersistence,
  buildMalwareScanVersionDeduplicationKey,
  parseWorkspaceBackgroundJobPayload,
} from "@/lib/workspace/background-jobs/job-payload";

describe("workspace background job payload", () => {
  it("parses malware scan payload with canonical ids only", () => {
    const payload = parseWorkspaceBackgroundJobPayload(
      WorkspaceBackgroundJobType.MALWARE_SCAN_VERSION,
      {
        v: 1,
        workspaceDocumentVersionId: "ver-1",
        workspaceDocumentId: "doc-1",
      },
    );

    expect(payload.workspaceDocumentVersionId).toBe("ver-1");
    expect(buildMalwareScanVersionDeduplicationKey("ver-1")).toBe(
      "MALWARE_SCAN_VERSION:ver-1",
    );
  });

  it("rejects unsafe payload tokens", () => {
    expect(() =>
      assertWorkspaceBackgroundJobPayloadSafeForPersistence({
        storageKey: "workspace/secret",
      }),
    ).toThrow(/forbidden/);
  });
});
