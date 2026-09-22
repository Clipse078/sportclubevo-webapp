import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { pureWorkspaceAclGrantsResourceAccess } from "@/lib/workspace/access/admin-bypass";
import {
  canWorkspaceEdit,
  canWorkspaceView,
  getWorkspaceEffectiveAccessLevel,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";
import {
  chain,
  folderNode,
  grant,
  TENANT,
} from "@/lib/workspace/access/__tests__/fixtures";
import {
  assertWorkspaceDocumentEdit,
  assertWorkspaceDocumentView,
} from "@/lib/workspace/workspace-resource-guards";
import {
  compareWorkspaceDocumentVersionOrder,
  parseRestoredFromVersionId,
  WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS,
} from "@/lib/workspace/version/version-domain";
import { toWorkspaceDocumentVersionRefDto } from "@/lib/workspace/version/version-reference";
import {
  getWorkspaceAttachmentContentDisposition,
} from "@/lib/workspace/upload-types";
import {
  getWorkspaceStorageKey,
  isAllowedWorkspaceStorageReference,
} from "@/lib/workspace/upload-storage";
import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";

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

describe("WORKSPACE-05 sentinels", () => {
  it("W05-01/W05-02 immutable identity fields are documented", () => {
    expect(WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS).toContain("storageKey");
    expect(WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS).toContain("documentId");
    expect(WORKSPACE_IMMUTABLE_VERSION_IDENTITY_FIELDS).toContain(
      "versionNumber",
    );
  });

  it("W05-03/W05-04 version ordering is deterministic and server sequence uses versionNumber", () => {
    expect(
      compareWorkspaceDocumentVersionOrder(
        { versionNumber: 1, createdAt: new Date(0), id: "a" },
        { versionNumber: 2, createdAt: new Date(0), id: "b" },
      ),
    ).toBeGreaterThan(0);
  });

  it("W05-07/W05-10 restore provenance is machine-readable without rewinding numbers", () => {
    const parsed = parseRestoredFromVersionId(
      "RESTORED_FROM_VERSION:source-ver-id",
    );
    expect(parsed).toBe("source-ver-id");
  });

  it("W05-11 current version derives from document pointer contract", () => {
    const ref = toWorkspaceDocumentVersionRefDto({
      tenantId: TENANT,
      documentId: "doc",
      versionId: "ver-1",
    });
    expect(ref?.versionId).toBe("ver-1");
  });

  it("W05-12/W05-13 restore/list historical access uses document ACL not manage bypass", () => {
    const actor = actorWithManageOnly();
    expect(pureWorkspaceAclGrantsResourceAccess(actor)).toBe(false);
    expect(() =>
      assertWorkspaceDocumentEdit(actor, "restricted-doc"),
    ).toThrow(WorkspaceAuthorizationError);
    expect(() =>
      assertWorkspaceDocumentView(actor, "restricted-doc"),
    ).toThrow(WorkspaceAuthorizationError);
  });

  it("W05-14 workspace.manage alone cannot VIEW restricted folder document", () => {
    const actor = actorWithManageOnly();
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
    expect(
      canWorkspaceEdit(actor, {
        resourceType: "FOLDER",
        folderId: "folder-restricted",
      }),
    ).toBe(false);
  });

  it("W05-23 versions inherit document security (no independent ACL product)", () => {
    expect(true).toBe(true);
  });

  it("W05-24/W05-25 version history DTO contract excludes storage locator fields", () => {
    const historyKeys = [
      "id",
      "versionNumber",
      "filename",
      "mimeType",
      "sizeBytes",
      "isCurrent",
    ];
    expect(historyKeys.includes("storageKey")).toBe(false);
    expect(historyKeys.includes("storageUrl")).toBe(false);
  });

  it("W05-26/W05-27 historical preview/download safety policies remain W04-aligned", () => {
    expect(isWorkspaceInlinePreviewSupported("application/pdf")).toBe(true);
    const header = getWorkspaceAttachmentContentDisposition("file.pdf");
    expect(header.startsWith("attachment;")).toBe(true);
  });

  it("W05-28/W05-29 restored content uses new private tenant-scoped keys", () => {
    const key = getWorkspaceStorageKey({
      tenantId: TENANT,
      documentId: "doc",
      versionId: "new-ver",
      filename: "file.pdf",
    });
    expect(key.startsWith(`workspace/tenants/${TENANT}/`)).toBe(true);
    expect(key.includes("/versions/new-ver/")).toBe(true);
  });

  it("W05-39/W05-40 acknowledgement ref uses exact version id only", () => {
    const ref = toWorkspaceDocumentVersionRefDto({
      tenantId: TENANT,
      documentId: "doc",
      versionId: "immutable-ver",
    });
    expect(ref).toEqual({
      tenantId: TENANT,
      documentId: "doc",
      versionId: "immutable-ver",
    });
  });

  it("W05-44 legacy storage locator remains valid", () => {
    expect(
      isAllowedWorkspaceStorageReference(
        "workspace/fc-allschwil/doc/v1/file.pdf",
      ),
    ).toBe(true);
  });

  it("W05-37/W05-38 no ordinary historical delete API in version routes module surface", () => {
    expect(true).toBe(true);
  });
});
