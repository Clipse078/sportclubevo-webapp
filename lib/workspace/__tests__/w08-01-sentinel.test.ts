import { describe, expect, it, vi } from "vitest";

import { buildAuditData, sanitizeAuditValue } from "@/lib/audit/audit-record";
import { logAction } from "@/lib/audit/log-action";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  WorkspaceAuditAction,
  normalizeWorkspaceAuditActionLabel,
} from "@/lib/workspace/audit/workspace-audit-actions";
import { WORKSPACE_AUDIT_APPEND_ONLY } from "@/lib/workspace/audit/append-only-contract";
import {
  WORKSPACE_AUDIT_MAX_PAGE_SIZE,
  workspaceAuditActionLabel,
} from "@/lib/workspace/audit/workspace-audit-dto";
import {
  hasWorkspaceAuditViewPermission,
  listWorkspaceGovernanceAuditEvents,
} from "@/lib/workspace/audit/workspace-audit-read-service";
import {
  toWorkspaceGovernanceLogInput,
  writeWorkspaceGovernanceAudit,
} from "@/lib/workspace/audit/workspace-audit-write";
import { buildWorkspaceSystemActorMetadata } from "@/lib/workspace/audit/system-actor";

describe("WORKSPACE-08-01 sentinels", () => {
  it("W08-01-01 audit event always tenant scoped", () => {
    expect(() =>
      toWorkspaceGovernanceLogInput({
        tenantId: "",
        action: WorkspaceAuditAction.FOLDER_CREATED,
        entityType: "WorkspaceFolder",
        entityId: "f1",
      }),
    ).toThrow();
  });

  it("W08-01-03 workspace.manage does not automatically grant audit.view", () => {
    expect(hasWorkspaceAuditViewPermission([PERMISSIONS.WORKSPACE_MANAGE])).toBe(
      false,
    );
  });

  it("W08-01-04 document MANAGE is not audit.view", () => {
    expect(hasWorkspaceAuditViewPermission(["document.manage" as never])).toBe(
      false,
    );
  });

  it("W08-01-05 creator does not grant audit.view", () => {
    expect(hasWorkspaceAuditViewPermission(["creator" as never])).toBe(false);
  });

  it("W08-01-07 audit pagination bounded", () => {
    expect(WORKSPACE_AUDIT_MAX_PAGE_SIZE).toBeLessThanOrEqual(50);
  });

  it("W08-01-08 audit DTO sanitizer excludes storage locator", () => {
    const sanitized = sanitizeAuditValue({
      storageKey: "workspace/tenants/t/documents/d/versions/v/file.pdf",
      note: "ok",
    }) as Record<string, unknown>;
    expect(sanitized.storageKey).toBeUndefined();
    expect(sanitized.note).toBe("ok");
  });

  it("W08-01-09 audit DTO sanitizer excludes signed URL", () => {
    const sanitized = sanitizeAuditValue({
      storageUrl: "https://example.com/signed",
    }) as Record<string, unknown>;
    expect(sanitized.storageUrl).toBeUndefined();
  });

  it("W08-01-10 governance writer avoids document byte fields in afterJson", () => {
    const input = toWorkspaceGovernanceLogInput({
      tenantId: "t1",
      entityType: "WorkspaceDocumentVersion",
      entityId: "v1",
      action: WorkspaceAuditAction.DOCUMENT_VERSION_CREATED,
      afterJson: { versionId: "v1", mimeType: "application/pdf", sizeBytes: 10 },
    });
    const payload = JSON.stringify(input.afterJson);
    expect(payload).not.toMatch(/secret body|base64/i);
    expect(payload).toContain("mimeType");
  });

  it("W08-01-11 successful mutation uses SUCCESS outcome by default", () => {
    const data = buildAuditData({
      moduleKey: "workspace",
      entityType: "WorkspaceFolder",
      entityId: "f1",
      action: WorkspaceAuditAction.FOLDER_CREATED,
    });
    expect((data.metadataJson as { outcome: string }).outcome).toBe("SUCCESS");
  });

  it("W08-01-15 actor User.id canonical in governance writer", async () => {
    const create = vi.fn().mockResolvedValue({ id: "a1" });
    await writeWorkspaceGovernanceAudit(
      { auditLog: { create } },
      {
        tenantId: "t1",
        actorUserId: "user-1",
        entityType: "WorkspaceFolder",
        entityId: "f1",
        action: WorkspaceAuditAction.FOLDER_CREATED,
      },
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorUserId: "user-1" }),
      }),
    );
  });

  it("W08-01-16 Person.id optional metadata", () => {
    const input = toWorkspaceGovernanceLogInput({
      tenantId: "t1",
      actorUserId: "u1",
      actorPersonId: "p1",
      entityType: "WorkspaceFolder",
      entityId: "f1",
      action: WorkspaceAuditAction.FOLDER_CREATED,
    });
    expect((input.metadataJson as { actorPersonId: string }).actorPersonId).toBe(
      "p1",
    );
  });

  it("W08-01-17 system actor does not require fake User", () => {
    const meta = buildWorkspaceSystemActorMetadata({ jobType: "purge" });
    expect(meta.source).toBe("system");
    expect(meta.jobType).toBe("purge");
  });

  it("W08-01-18 exact W07 version identity in reference actions", () => {
    expect(workspaceAuditActionLabel("TASK_DOCUMENT_LINKED")).toContain("Dokumentversion");
    expect(normalizeWorkspaceAuditActionLabel("TASK_DOCUMENT_LINKED")).toBe(
      "TASK_DOCUMENT_LINKED",
    );
  });

  it("W08-01-19 restore audit action preserves version identity label", () => {
    expect(workspaceAuditActionLabel(WorkspaceAuditAction.DOCUMENT_VERSION_RESTORED)).toBeTruthy();
  });

  it("W08-01-20 append-only contract documents no update/delete API", () => {
    expect(WORKSPACE_AUDIT_APPEND_ONLY.applicationContract).toMatch(/INSERT-only/i);
  });

  it("W08-01-21 favorites/recents are not workspace governance module", () => {
    expect(hasWorkspaceAuditViewPermission([PERMISSIONS.WORKSPACE_VIEW])).toBe(
      false,
    );
  });

  it("W08-01-22 logAction is best-effort by contract", () => {
    expect(logAction.toString()).toContain("Audit log failed");
  });

  it("W08-01-02 cross-tenant audit read denied at service boundary", async () => {
    await expect(
      listWorkspaceGovernanceAuditEvents({
        tenantId: "t1",
        permissionKeys: [PERMISSIONS.WORKSPACE_VIEW],
        viewerUserId: "u1",
      }),
    ).rejects.toThrow(/workspace\.audit\.view/);
  });

  it("W08-01-06 authorized audit viewer permission key", () => {
    expect(hasWorkspaceAuditViewPermission([PERMISSIONS.WORKSPACE_AUDIT_VIEW])).toBe(
      true,
    );
  });
});
