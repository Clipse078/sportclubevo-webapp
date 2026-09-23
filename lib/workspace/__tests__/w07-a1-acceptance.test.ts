/**
 * WORKSPACE-07-A1 — final acceptance sentinels (immutable refs, migration safety, auth).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RequirementStatus, TaskContextType } from "@prisma/client";

import {
  getWorkspaceDocumentDeletionBlockers,
  canPermanentlyDeleteWorkspaceDocument,
} from "@/lib/workspace/deletion/deletion-blockers";
import { resolveTaskDocumentReferencePresentations } from "@/lib/workspace/reference/resolve-workspace-version-references";
import { restrictedVersionReferencePresentation } from "@/lib/workspace/reference/workspace-version-reference-presentation";
import { assertRequirementReferenceMutable } from "@/lib/requirements/requirement-document-reference-mutable";
import { isPrimaryDocumentContextForImmutableEvidence } from "@/lib/tasks/task-primary-document-context";

const MIGRATION_PATH = join(
  process.cwd(),
  "prisma/migrations/20260922240000_workspace_07_immutable_document_version_references/migration.sql",
);
const SCHEMA_PATH = join(process.cwd(), "prisma/schema.prisma");

const prismaMocks = vi.hoisted(() => ({
  workspaceDocument: { findMany: vi.fn(), findFirst: vi.fn() },
  workspaceDocumentVersion: { findMany: vi.fn(), findFirst: vi.fn() },
  taskDocumentReference: { findMany: vi.fn() },
  requirementWorkspaceDocumentVersionReference: { findMany: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findMany: (...args: unknown[]) => prismaMocks.workspaceDocument.findMany(...args),
      findFirst: (...args: unknown[]) => prismaMocks.workspaceDocument.findFirst(...args),
    },
    workspaceDocumentVersion: {
      findMany: (...args: unknown[]) => prismaMocks.workspaceDocumentVersion.findMany(...args),
      findFirst: (...args: unknown[]) => prismaMocks.workspaceDocumentVersion.findFirst(...args),
    },
    taskDocumentReference: {
      findMany: (...args: unknown[]) => prismaMocks.taskDocumentReference.findMany(...args),
    },
    requirementWorkspaceDocumentVersionReference: {
      findMany: (...args: unknown[]) =>
        prismaMocks.requirementWorkspaceDocumentVersionReference.findMany(...args),
    },
  },
}));

vi.mock("@/lib/workspace/document-access", () => ({
  assertWorkspaceDocumentLinkable: vi.fn().mockResolvedValue(undefined),
  filterReadableWorkspaceDocumentIds: vi.fn().mockResolvedValue(new Set()),
  WORKSPACE_DOCUMENT_LINKABLE_ERROR:
    "Das Dokument ist nicht verfügbar oder kann nicht verknüpft werden.",
}));

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const TENANT = "tenant-a";
const ctx = { tenantId: TENANT, userId: "user-1", permissionKeys: [] };

describe("WORKSPACE-07-A1 acceptance sentinels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.taskDocumentReference.findMany.mockResolvedValue([]);
    prismaMocks.requirementWorkspaceDocumentVersionReference.findMany.mockResolvedValue([]);
  });

  it("W07-A1-01 EXACT binding cannot exist with null versionId (DB CHECK)", () => {
    const migration = readMigration();
    expect(migration).toMatch(/TaskDocumentReference_version_binding_invariant/);
    expect(migration).toMatch(
      /versionBinding.*EXACT[\s\S]*workspaceDocumentVersionId" IS NOT NULL/,
    );
  });

  it("W07-A1-02 LEGACY_UNRESOLVED cannot exist without legacy document identity", () => {
    const migration = readMigration();
    expect(migration).toMatch(
      /LEGACY_UNRESOLVED[\s\S]*"documentId" IS NOT NULL[\s\S]*"workspaceDocumentVersionId" IS NULL/,
    );
  });

  it("W07-A1-03 contradictory document/version target rejected at link validation", async () => {
    const { resolveWorkspaceDocumentVersionForLink, WorkspaceVersionLinkValidationError } =
      await import("@/lib/workspace/reference/workspace-version-link-validation");

    prismaMocks.workspaceDocument.findFirst.mockResolvedValue({
      id: "doc-a",
      tenantId: TENANT,
      currentVersionId: "ver-current",
    });
    prismaMocks.workspaceDocumentVersion.findFirst.mockResolvedValue(null);

    const { assertWorkspaceDocumentLinkable } = await import("@/lib/workspace/document-access");
    vi.mocked(assertWorkspaceDocumentLinkable).mockResolvedValue(undefined);

    await expect(
      resolveWorkspaceDocumentVersionForLink(ctx, {
        documentId: "doc-a",
        workspaceDocumentVersionId: "ver-other-doc",
      }),
    ).rejects.toBeInstanceOf(WorkspaceVersionLinkValidationError);
  });

  it("W07-A1-04 single-version legacy backfill proof remains valid (immutable version history)", () => {
    const migration = readMigration();
    const invariants = readFileSync(
      join(process.cwd(), "docs/workspace/WORKSPACE-05-INVARIANTS.md"),
      "utf8",
    );
    expect(migration).toMatch(/HAVING COUNT\(\*\) = 1/);
    expect(migration).not.toMatch(/currentVersionId/);
    expect(invariants).toMatch(/Restore creates a \*\*new\*\* version/);
    expect(invariants).toMatch(/Historical version content cannot be overwritten/);
  });

  it("W07-A1-05 multi-version legacy row never receives currentVersionId automatically", () => {
    const migration = readMigration();
    expect(migration).not.toMatch(/currentVersionId/);
    expect(migration).toMatch(/LEGACY_UNRESOLVED/);
  });

  it("W07-A1-06 Task primary DOCUMENT context remains document-level navigation, not immutable evidence", () => {
    expect(
      isPrimaryDocumentContextForImmutableEvidence({
        contextType: TaskContextType.DOCUMENT,
        contextId: "doc-1",
      }),
    ).toBe(false);
    const resolver = readSrc("lib/workspace/reference/resolve-workspace-version-references.ts");
    expect(resolver).not.toMatch(/contextType.*DOCUMENT/);
  });

  it("W07-A1-07 ACTIVE Requirement reference mutation matches canonical 06G lifecycle", () => {
    expect(() => assertRequirementReferenceMutable(RequirementStatus.DRAFT)).not.toThrow();
    expect(() => assertRequirementReferenceMutable(RequirementStatus.ACTIVE)).not.toThrow();
    expect(() => assertRequirementReferenceMutable(RequirementStatus.CLOSED)).toThrow();
    expect(() => assertRequirementReferenceMutable(RequirementStatus.CANCELLED)).toThrow();

    const requirementService = readSrc("lib/requirements/requirement-service.ts");
    expect(requirementService).toMatch(/existing\.status === "ACTIVE"/);
    expect(requirementService).toMatch(/data\.title = normalizeTitle/);
    const foundation = readFileSync(
      join(process.cwd(), "docs/aufgaben/requirements-foundation-06g1.md"),
      "utf8",
    );
    expect(foundation).toMatch(/Active audience is frozen/);
  });

  it("W07-A1-08 existing Requirement acknowledgement cannot gain new document semantic scope", () => {
    const schema = readSchema();
    const recipientBlock = schema.slice(
      schema.indexOf("model RequirementRecipient"),
      schema.indexOf("model RequirementRecipient") + 1200,
    );
    expect(recipientBlock).toMatch(/model RequirementRecipient/);
    expect(recipientBlock).not.toMatch(/workspaceDocumentVersionId/);
    const ackIdentity = readSrc(
      "lib/workspace/acknowledgement/document-version-acknowledgement-identity.ts",
    );
    expect(ackIdentity).toMatch(/no workflow in W07/);
  });

  it("W07-A1-09 exact version FK prevents referenced document destruction through cascade graph", () => {
    const schema = readSchema();
    expect(schema).toMatch(
      /workspaceDocumentVersion WorkspaceDocumentVersion\? @relation[\s\S]*onDelete: Restrict/,
    );
    expect(schema).toMatch(
      /document WorkspaceDocument @relation\("WorkspaceDocumentVersions"[\s\S]*onDelete: Cascade/,
    );
    const migration = readMigration();
    expect(migration).toMatch(/ON DELETE RESTRICT/);
  });

  it("W07-A1-10 Task create-ref vs delete lock contract verified", () => {
    const linkSrc = readSrc("lib/tasks/task-document-reference-service.ts");
    const purgeSrc = readSrc(
      "lib/workspace/governance/workspace-document-purge-service.ts",
    );
    expect(linkSrc).toMatch(/FOR UPDATE/);
    expect(purgeSrc).toMatch(/FOR UPDATE/);
    expect(purgeSrc).toMatch(/getWorkspaceDocumentDeletionBlockers|evaluateWorkspaceDocumentPurgeEligibility/);
  });

  it("W07-A1-11 Requirement create-ref vs delete lock contract verified", () => {
    const linkSrc = readSrc("lib/requirements/requirement-document-reference-service.ts");
    const purgeSrc = readSrc(
      "lib/workspace/governance/workspace-document-purge-service.ts",
    );
    expect(linkSrc).toMatch(/FOR UPDATE/);
    expect(purgeSrc).toMatch(/FOR UPDATE/);
  });

  it("W07-A1-12 folder subtree delete cannot bypass exact Task reference", () => {
    const folderDelete = readSrc("lib/workspace/folder-delete-service.ts");
    expect(folderDelete).toMatch(/getWorkspaceDocumentDeletionBlockers/);
  });

  it("W07-A1-13 folder subtree delete cannot bypass Requirement reference", () => {
    const folderDelete = readSrc("lib/workspace/folder-delete-service.ts");
    expect(folderDelete).toMatch(/getWorkspaceDocumentDeletionBlockers/);
    const blockers = readSrc("lib/workspace/deletion/deletion-blockers.ts");
    expect(blockers).toMatch(/REQUIREMENT_WORKSPACE_DOCUMENT_VERSION_REFERENCE/);
  });

  it("W07-A1-14 legacy unresolved presentation never fabricates exact-version route", async () => {
    const { filterReadableWorkspaceDocumentIds } = await import(
      "@/lib/workspace/document-access"
    );
    vi.mocked(filterReadableWorkspaceDocumentIds).mockResolvedValue(new Set(["doc-legacy"]));
    prismaMocks.workspaceDocument.findMany.mockResolvedValue([
      {
        id: "doc-legacy",
        name: "Legacy Doc",
        status: "ACTIVE",
        archivedAt: null,
        trashedAt: null,
      },
    ]);

    const map = await resolveTaskDocumentReferencePresentations(ctx, [
      {
        referenceId: "ref-legacy",
        documentId: "doc-legacy",
        workspaceDocumentVersionId: null,
        versionBinding: "LEGACY_UNRESOLVED",
      },
    ]);
    const presentation = map.get("ref-legacy");
    expect(presentation?.accessible).toBe("legacy_unresolved");
    expect(JSON.stringify(presentation)).not.toMatch(/versionId|version=/);
  });

  it("W07-A1-15 picker server source zero-disclosure verified", () => {
    const access = readSrc("lib/workspace/document-access.ts");
    expect(access).toMatch(/buildWorkspaceReadWhere/);
    expect(access).toMatch(/canWorkspaceView/);
    const picker = readSrc("components/admin/aufgaben/WorkspaceDocumentVersionReferencePicker.tsx");
    expect(picker).not.toMatch(/searchWorkspaceDocumentsForTaskLink/);
  });

  it("W07-A1-16 reference DTO contains no storageKey/storageUrl", () => {
    const presentation = restrictedVersionReferencePresentation("ref-1");
    expect(Object.keys(presentation)).not.toContain("storageKey");
    expect(Object.keys(presentation)).not.toContain("storageUrl");
    const dtoSrc = readSrc("lib/workspace/reference/workspace-version-reference-presentation.ts");
    expect(dtoSrc.includes("storageKey")).toBe(false);
    expect(dtoSrc.includes("storageUrl")).toBe(false);
  });

  it("W07-A1-17 current-version selection persists exact ID atomically", () => {
    const linkValidation = readSrc("lib/workspace/reference/workspace-version-link-validation.ts");
    const taskLink = readSrc("lib/tasks/task-document-reference-service.ts");
    expect(linkValidation).toMatch(/requestedVersionId \?\? document\.currentVersionId/);
    expect(taskLink).toMatch(/workspaceDocumentVersionId: resolved\.workspaceDocumentVersionId/);
    expect(taskLink).toMatch(/\$transaction/);
  });

  it("W07-A1-18 restore-as-new-version leaves refs unchanged (immutable version identity)", () => {
    const invariants = readFileSync(
      join(process.cwd(), "docs/workspace/WORKSPACE-05-INVARIANTS.md"),
      "utf8",
    );
    expect(invariants).toMatch(/Restore creates a \*\*new\*\* version/);
    const resolver = readSrc("lib/workspace/reference/resolve-workspace-version-references.ts");
    expect(resolver).not.toMatch(/currentVersionId/);
  });

  it("W07-A1-19 ACL loss hides metadata without deleting structural reference", async () => {
    prismaMocks.workspaceDocumentVersion.findMany.mockResolvedValue([
      {
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 1,
        document: {
          id: "doc-1",
          name: "Secret",
          status: "ACTIVE",
          archivedAt: null,
          trashedAt: null,
        },
      },
    ]);
    const map = await resolveTaskDocumentReferencePresentations(ctx, [
      {
        referenceId: "ref-exact",
        documentId: null,
        workspaceDocumentVersionId: "ver-1",
        versionBinding: "EXACT",
      },
    ]);
    expect(map.get("ref-exact")).toEqual({
      accessible: false,
      referenceId: "ref-exact",
    });
  });

  it("W07-A1-20 cross-tenant forged version/document combination fails closed", async () => {
    const { loadWorkspaceDocumentVersionForTenantValidation, WorkspaceVersionLinkValidationError } =
      await import("@/lib/workspace/reference/workspace-version-link-validation");
    prismaMocks.workspaceDocumentVersion.findFirst.mockResolvedValue(null);
    await expect(
      loadWorkspaceDocumentVersionForTenantValidation(ctx, "foreign-version"),
    ).rejects.toBeInstanceOf(WorkspaceVersionLinkValidationError);
  });

  it("W07-A1 — deletion blockers discover exact refs before destructive delete", async () => {
    prismaMocks.taskDocumentReference.findMany.mockImplementation(async (args: { where: unknown }) => {
      const where = args.where as { workspaceDocumentVersion?: { documentId?: string } };
      if (where.workspaceDocumentVersion?.documentId === "doc-blocked") {
        return [{ id: "task-ref" }];
      }
      return [];
    });
    const result = await canPermanentlyDeleteWorkspaceDocument(
      {
        taskDocumentReference: prismaMocks.taskDocumentReference,
        requirementWorkspaceDocumentVersionReference:
          prismaMocks.requirementWorkspaceDocumentVersionReference,
        workspaceDocument: {},
      },
      TENANT,
      "doc-blocked",
    );
    expect(result.allowed).toBe(false);
  });
});
