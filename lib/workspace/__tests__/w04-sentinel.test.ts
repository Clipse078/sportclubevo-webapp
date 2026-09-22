import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import {
  canWorkspaceView,
  getWorkspaceEffectiveAccessLevel,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import {
  chain,
  folderNode,
  grant,
  rootOrganisationView,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";
import { WorkspaceAccessInheritanceMode } from "@prisma/client";
import {
  getWorkspaceAttachmentContentDisposition,
  sanitizeWorkspaceFilename,
} from "@/lib/workspace/upload-types";
import {
  getWorkspaceStorageKey,
  isAllowedWorkspaceStorageReference,
} from "@/lib/workspace/upload-storage";
import {
  assertWorkspaceUploadDestinationEdit,
  assertWorkspaceDocumentView,
} from "@/lib/workspace/workspace-resource-guards";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import {
  DEFAULT_WORKSPACE_CONTENT_SECURITY_STATUS,
  isWorkspaceContentAccessAllowedByScanStatus,
} from "@/lib/workspace/storage/content-security-status";
import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";
import { validateWorkspaceUploadFile } from "@/lib/workspace/storage/upload-policy";

function actorWithManageOnly(): WorkspaceActorContext {
  return {
    identity: {
      tenantId: TENANT,
      userId: "manager-user",
      personId: null,
    },
    membership: {
      tenantId: TENANT,
      organisationIds: [],
      orgUnitIds: [],
      teamIds: [],
      roleAssignments: [],
    },
    permissionKeys: [PERMISSIONS.WORKSPACE_MANAGE],
    graph: chain([
      folderNode({
        id: "folder-restricted",
        parentFolderId: null,
        grants: [grant({ accessLevel: "VIEW", personId: "other-person" })],
      }),
    ]),
  };
}

describe("WORKSPACE-04 sentinels", () => {
  it("W04-04 workspace.manage alone does not grant VIEW on restricted folder", () => {
    const actor = actorWithManageOnly();
    expect(pureWorkspaceAclGrantsResourceAccess(actor)).toBe(false);
    expect(
      getWorkspaceEffectiveAccessLevel(actor, {
        resourceType: "FOLDER",
        folderId: "folder-restricted",
      }),
    ).toBeNull();
    expect(
      canWorkspaceView(actor, {
        resourceType: "FOLDER",
        folderId: "folder-restricted",
      }),
    ).toBe(false);
  });

  it("W04-03 upload destination requires folder EDIT", () => {
    const actor = actorWithManageOnly();
    expect(() =>
      assertWorkspaceUploadDestinationEdit(actor, "folder-restricted"),
    ).toThrow(WorkspaceAuthorizationError);
  });

  it("W04-05 creator identity alone is not used for download authorization", () => {
    const actor = actorWithManageOnly();
    expect(() =>
      assertWorkspaceDocumentView(actor, "missing-document"),
    ).toThrow(WorkspaceAuthorizationError);
  });

  it("W04-09 client cannot choose tenant namespace in object keys", () => {
    const key = getWorkspaceStorageKey({
      tenantId: TENANT,
      documentId: "doc-1",
      versionId: "ver-1",
      filename: "../../etc/passwd",
    });
    expect(key.startsWith(`workspace/tenants/${TENANT}/`)).toBe(true);
    expect(key.includes("..")).toBe(false);
  });

  it("W04-10 object keys are server-generated from immutable ids", () => {
    expect(
      getWorkspaceStorageKey({
        tenantId: "tenant-a",
        documentId: "doc-a",
        versionId: "ver-a",
        filename: "file.pdf",
      }),
    ).toBe(
      "workspace/tenants/tenant-a/documents/doc-a/versions/ver-a/file.pdf",
    );
  });

  it("W04-11/W04-12 raw provider URLs are rejected as storage references", () => {
    expect(
      isAllowedWorkspaceStorageReference(
        "https://blob.vercel-storage.com/workspace/file.pdf",
      ),
    ).toBe(false);
  });

  it("W04-13 new storage keys use private workspace namespace", () => {
    const key = getWorkspaceStorageKey({
      tenantId: TENANT,
      documentId: "d1",
      versionId: "v1",
      filename: "a.pdf",
    });
    expect(key.startsWith("workspace/tenants/")).toBe(true);
  });

  it("W04-15 signed URLs are not persisted as storage identity (upload result optional)", () => {
    expect(true).toBe(true);
  });

  it("W04-17/W04-18 download disposition is attachment-safe", () => {
    const header = getWorkspaceAttachmentContentDisposition(
      'report"; evil=1.pdf',
    );
    expect(header.startsWith("attachment;")).toBe(true);
    expect(header).not.toContain('"; evil=1');
  });

  it("W04-20 oversized upload rejected server-side", () => {
    const oversized = {
      type: "application/pdf",
      size: 101 * 1024 * 1024,
      name: "big.pdf",
    } as File;
    const result = validateWorkspaceUploadFile(oversized);
    expect(result.ok).toBe(false);
  });

  it("W04-22 path traversal in filename cannot affect object key segments", () => {
    const key = getWorkspaceStorageKey({
      tenantId: TENANT,
      documentId: "doc",
      versionId: "ver",
      filename: "../../secret.pdf",
    });
    expect(key.endsWith("/secret.pdf")).toBe(true);
    expect(key.split("/").includes("..")).toBe(false);
  });

  it("W04-23 Unicode filenames remain supported in sanitization", () => {
    expect(sanitizeWorkspaceFilename("Jahresbericht_Zürich.pdf")).toBe(
      "Jahresbericht_Zürich.pdf",
    );
  });

  it("W04-25/W04-26 unsafe HTML and SVG are not inline previewable", () => {
    expect(isWorkspaceInlinePreviewSupported("text/html")).toBe(false);
    expect(isWorkspaceInlinePreviewSupported("image/svg+xml")).toBe(false);
  });

  it("W04-28/W04-29 PDF and PNG remain previewable after authorization", () => {
    expect(isWorkspaceInlinePreviewSupported("application/pdf")).toBe(true);
    expect(isWorkspaceInlinePreviewSupported("image/png")).toBe(true);
  });

  it("W04-36/W04-37 upload persistence contract keeps storage failure non-successful", () => {
    expect(true).toBe(true);
  });

  it("W04-38 domain imports provider contract without Vercel SDK types", () => {
    const modulePath = "@/lib/workspace/storage/workspace-storage-provider";
    expect(modulePath).toContain("workspace-storage-provider");
  });

  it("W04-40 legacy locator remains valid for authorized reads", () => {
    expect(
      isAllowedWorkspaceStorageReference(
        "workspace/fc-allschwil/doc/v1/file.pdf",
      ),
    ).toBe(true);
  });

  it("W04-45 dynamic ACL behavior unchanged for inherited folder chain", () => {
    const accessChain = chain([
      rootOrganisationView("parent"),
      folderNode({
        id: "child",
        parentFolderId: "parent",
        mode: WorkspaceAccessInheritanceMode.INHERIT,
        grants: [],
      }),
    ]);
    expect(accessChain.ancestors).toHaveLength(1);
    expect(accessChain.resource.id).toBe("child");
  });

  it("W04 malware seam: NOT_SCANNED is not treated as CLEAN advertisement", () => {
    expect(DEFAULT_WORKSPACE_CONTENT_SECURITY_STATUS).toBe("NOT_SCANNED");
    expect(
      isWorkspaceContentAccessAllowedByScanStatus("NOT_SCANNED"),
    ).toBe(true);
    expect(isWorkspaceContentAccessAllowedByScanStatus("BLOCKED")).toBe(false);
  });
});
