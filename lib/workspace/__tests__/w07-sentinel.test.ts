import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RequirementStatus,
  TaskDocumentReferenceVersionBinding,
  WorkspaceDocumentStatus,
} from "@prisma/client";

import { buildWorkspaceInternalLink } from "@/lib/workspace/internal-links";
import {
  WORKSPACE_DELETION_BLOCKED_CODE,
  canPermanentlyDeleteWorkspaceDocument,
  getWorkspaceDocumentDeletionBlockers,
} from "@/lib/workspace/deletion/deletion-blockers";
import {
  assertAcknowledgementVersionIdentity,
  type WorkspaceDocumentVersionAcknowledgementIdentity,
} from "@/lib/workspace/acknowledgement/document-version-acknowledgement-identity";
import {
  buildExactVersionWorkspaceUrl,
  restrictedVersionReferencePresentation,
} from "@/lib/workspace/reference/workspace-version-reference-presentation";
import { toWorkspaceDocumentVersionRefDto } from "@/lib/workspace/version/version-reference";
import { deriveWorkspaceDocumentLifecycle } from "@/lib/workspace/lifecycle/lifecycle-domain";

const MIGRATION_PATH = join(
  process.cwd(),
  "prisma/migrations/20260922240000_workspace_07_immutable_document_version_references/migration.sql",
);
const SCHEMA_PATH = join(process.cwd(), "prisma/schema.prisma");

const prismaMocks = vi.hoisted(() => ({
  workspaceDocument: { findFirst: vi.fn(), findMany: vi.fn() },
  workspaceDocumentVersion: { findFirst: vi.fn(), findMany: vi.fn() },
  taskDocumentReference: { findMany: vi.fn() },
  requirementWorkspaceDocumentVersionReference: { findMany: vi.fn() },
  requirement: { findFirst: vi.fn() },
  executeRaw: vi.fn(),
  transaction: vi.fn(),
  workspaceDocumentFindFirstDelete: vi.fn(),
  workspaceDocumentDelete: vi.fn(),
  storageDelete: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    workspaceDocument: {
      findFirst: (...args: unknown[]) => prismaMocks.workspaceDocument.findFirst(...args),
      findMany: (...args: unknown[]) => prismaMocks.workspaceDocument.findMany(...args),
    },
    workspaceDocumentVersion: {
      findFirst: (...args: unknown[]) => prismaMocks.workspaceDocumentVersion.findFirst(...args),
      findMany: (...args: unknown[]) => prismaMocks.workspaceDocumentVersion.findMany(...args),
    },
    taskDocumentReference: {
      findMany: (...args: unknown[]) => prismaMocks.taskDocumentReference.findMany(...args),
    },
    requirementWorkspaceDocumentVersionReference: {
      findMany: (...args: unknown[]) =>
        prismaMocks.requirementWorkspaceDocumentVersionReference.findMany(...args),
    },
    requirement: {
      findFirst: (...args: unknown[]) => prismaMocks.requirement.findFirst(...args),
    },
    $transaction: (...args: unknown[]) => prismaMocks.transaction(...args),
  },
}));

vi.mock("@/lib/workspace/document-access", () => ({
  assertWorkspaceDocumentLinkable: vi.fn().mockResolvedValue(undefined),
  filterReadableWorkspaceDocumentIds: vi.fn(),
  WORKSPACE_DOCUMENT_LINKABLE_ERROR:
    "Das Dokument ist nicht verfügbar oder kann nicht verknüpft werden.",
  searchWorkspaceDocumentsForTaskLink: vi.fn(),
}));

vi.mock("@/lib/workspace/upload-storage", () => ({
  workspaceStorageProvider: { delete: prismaMocks.storageDelete },
}));

vi.mock("@/lib/audit/audit-record", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/audit/audit-record")>();
  return {
    ...actual,
    writeAuditRecord: vi.fn(),
  };
});

vi.mock("@/lib/requirements/requirement-authorization", () => ({
  canManageRequirement: vi.fn().mockReturnValue(true),
  canReadRequirement: vi.fn().mockReturnValue(true),
}));

const TENANT = "tenant-a";

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, "utf8");
}

function readSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf8");
}

function deletionClient() {
  return {
    taskDocumentReference: prismaMocks.taskDocumentReference,
    requirementWorkspaceDocumentVersionReference:
      prismaMocks.requirementWorkspaceDocumentVersionReference,
    workspaceDocument: {},
  };
}

describe("WORKSPACE-07 sentinels", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { assertWorkspaceDocumentLinkable, filterReadableWorkspaceDocumentIds } =
      await import("@/lib/workspace/document-access");
    vi.mocked(assertWorkspaceDocumentLinkable).mockResolvedValue(undefined);
    vi.mocked(filterReadableWorkspaceDocumentIds).mockResolvedValue(new Set());
    prismaMocks.taskDocumentReference.findMany.mockResolvedValue([]);
    prismaMocks.requirementWorkspaceDocumentVersionReference.findMany.mockResolvedValue([]);
    prismaMocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        $executeRaw: prismaMocks.executeRaw,
        taskDocumentReference: {
          createMany: vi.fn(),
          findMany: (...args: unknown[]) => prismaMocks.taskDocumentReference.findMany(...args),
        },
        requirementWorkspaceDocumentVersionReference: {
          createMany: vi.fn(),
          findMany: (...args: unknown[]) =>
            prismaMocks.requirementWorkspaceDocumentVersionReference.findMany(...args),
        },
        workspaceDocument: {
          findFirst: prismaMocks.workspaceDocumentFindFirstDelete,
          delete: prismaMocks.workspaceDocumentDelete,
        },
        auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      }),
    );
  });

  it("W07-01 migration pins task refs to WorkspaceDocumentVersion with RESTRICT", () => {
    const migration = readMigration();
    expect(migration).toMatch(
      /TaskDocumentReference_workspaceDocumentVersionId_fkey[\s\S]*ON DELETE RESTRICT/,
    );
  });

  it("W07-02 migration creates requirement version reference table with RESTRICT FK", () => {
    const migration = readMigration();
    expect(migration).toMatch(/CREATE TABLE "RequirementWorkspaceDocumentVersionReference"/);
    expect(migration).toMatch(
      /RequirementWorkspaceDocumentVersionReference_workspaceDocumentVersionId_fkey[\s\S]*ON DELETE RESTRICT/,
    );
  });

  it("W07-03 migration marks unresolved legacy rows LEGACY_UNRESOLVED", () => {
    const migration = readMigration();
    expect(migration).toMatch(/versionBinding.*LEGACY_UNRESOLVED/);
    expect(migration).toMatch(/WHERE "workspaceDocumentVersionId" IS NULL/);
  });

  it("W07-04 migration backfills single-version legacy rows to LEGACY_SINGLE_VERSION", () => {
    const migration = readMigration();
    expect(migration).toMatch(/LEGACY_SINGLE_VERSION/);
    expect(migration).toMatch(/HAVING COUNT\(\*\) = 1/);
  });

  it("W07-05 schema exposes exact-version binding enum values", () => {
    const schema = readSchema();
    const migration = readMigration();
    expect(schema).toMatch(/enum TaskDocumentReferenceVersionBinding/);
    expect(schema).toMatch(/EXACT/);
    expect(schema).toMatch(/LEGACY_UNRESOLVED/);
    expect(schema).toMatch(/LEGACY_SINGLE_VERSION/);
    expect(migration).toMatch(/TaskDocumentReference_version_binding_invariant/);
  });

  it("W07-06 schema enforces unique requirementId plus workspaceDocumentVersionId", () => {
    const schema = readSchema();
    expect(schema).toMatch(
      /@@unique\(\[requirementId, workspaceDocumentVersionId\]\)/,
    );
  });

  it("W07-07 new task links persist immutable version FK with null documentId", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/workspaceDocumentVersionId: resolved\.workspaceDocumentVersionId/);
    expect(src).toMatch(/documentId: null/);
  });

  it("W07-08 new task links set versionBinding EXACT", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/versionBinding: TaskDocumentReferenceVersionBinding\.EXACT/);
  });

  it("W07-09 exact-version canonical links are ID-based with version query", () => {
    const url = buildExactVersionWorkspaceUrl("doc-1", "ver-1");
    expect(url).toBe(buildWorkspaceInternalLink({ type: "document", documentId: "doc-1", versionId: "ver-1" }));
    expect(url).toContain("version=ver-1");
    expect(url.includes("storage")).toBe(false);
  });

  it("W07-10 restricted reference presentation is zero-disclosure", () => {
    const presentation = restrictedVersionReferencePresentation("ref-x");
    expect(presentation).toEqual({ accessible: false, referenceId: "ref-x" });
    expect(Object.keys(presentation)).not.toContain("storageKey");
    expect(Object.keys(presentation)).not.toContain("storageUrl");
  });

  it("W07-11 immutable ref DTO carries ids only (no storage locators)", () => {
    const dto = toWorkspaceDocumentVersionRefDto({
      tenantId: TENANT,
      documentId: "doc-1",
      versionId: "ver-1",
    });
    expect(dto).toEqual({
      tenantId: TENANT,
      documentId: "doc-1",
      versionId: "ver-1",
    });
    const dtoSrc = readFileSync(join(process.cwd(), "lib/workspace/document-dto.ts"), "utf8");
    const refBlock = dtoSrc.slice(dtoSrc.indexOf("export type WorkspaceDocumentVersionRefDto"));
    expect(refBlock.includes("storageKey")).toBe(false);
    expect(refBlock.includes("storageUrl")).toBe(false);
  });

  it("W07-12 batch resolver selects version metadata without storage fields", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/resolve-workspace-version-references.ts"),
      "utf8",
    );
    expect(src.includes("storageKey")).toBe(false);
    expect(src.includes("storageUrl")).toBe(false);
    expect(src).toMatch(/versionNumber: true/);
  });

  it("W07-13 authorized version listing omits storage fields", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/workspace-version-link-validation.ts"),
      "utf8",
    );
    const listSection = src.slice(src.indexOf("listAuthorizedWorkspaceDocumentVersions"));
    expect(listSection.includes("storageKey")).toBe(false);
    expect(listSection.includes("storageUrl")).toBe(false);
    expect(listSection).toMatch(/filename: true/);
  });

  it("W07-14 legacy unresolved rows expose explicit unresolved message", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/resolve-workspace-version-references.ts"),
      "utf8",
    );
    expect(src).toMatch(/LEGACY_UNRESOLVED_MESSAGE/);
    expect(src).toMatch(/accessible: "legacy_unresolved"/);
  });

  it("W07-15 legacy single-version binding resolves through exact-version path", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/resolve-workspace-version-references.ts"),
      "utf8",
    );
    expect(src).toMatch(/TaskDocumentReferenceVersionBinding\.LEGACY_SINGLE_VERSION/);
    expect(src).toMatch(/exactRows\.push/);
  });

  it("W07-16 deletion registry blocks legacy document-level task references", async () => {
    prismaMocks.taskDocumentReference.findMany.mockImplementation(async (args: { where: unknown }) => {
      const where = args.where as {
        workspaceDocumentVersionId?: null;
        documentId?: string;
      };
      if (where.workspaceDocumentVersionId === null && where.documentId === "doc-1") {
        return [{ id: "legacy-ref" }];
      }
      return [];
    });

    const blockers = await getWorkspaceDocumentDeletionBlockers(deletionClient(), TENANT, "doc-1");
    expect(blockers.some((b) => b.kind === "TASK_DOCUMENT_REFERENCE_LEGACY")).toBe(true);
  });

  it("W07-17 deletion registry blocks exact task version references by documentId", async () => {
    prismaMocks.taskDocumentReference.findMany.mockImplementation(async (args: { where: unknown }) => {
      const where = args.where as { workspaceDocumentVersion?: { documentId?: string } };
      if (where.workspaceDocumentVersion?.documentId === "doc-1") {
        return [{ id: "exact-ref" }];
      }
      return [];
    });

    const blockers = await getWorkspaceDocumentDeletionBlockers(deletionClient(), TENANT, "doc-1");
    expect(blockers.some((b) => b.kind === "TASK_DOCUMENT_REFERENCE")).toBe(true);
  });

  it("W07-18 deletion registry blocks requirement workspace version references", async () => {
    prismaMocks.requirementWorkspaceDocumentVersionReference.findMany.mockResolvedValueOnce([
      { id: "req-ref" },
    ]);

    const blockers = await getWorkspaceDocumentDeletionBlockers(deletionClient(), TENANT, "doc-1");
    expect(blockers.some((b) => b.kind === "REQUIREMENT_WORKSPACE_DOCUMENT_VERSION_REFERENCE")).toBe(
      true,
    );
  });

  it("W07-19 canPermanentlyDeleteWorkspaceDocument fails closed when blockers exist", async () => {
    prismaMocks.requirementWorkspaceDocumentVersionReference.findMany.mockResolvedValueOnce([
      { id: "req-ref" },
    ]);

    const result = await canPermanentlyDeleteWorkspaceDocument(deletionClient(), TENANT, "doc-1");
    expect(result).toEqual({
      allowed: false,
      blockers: expect.arrayContaining([
        expect.objectContaining({ kind: "REQUIREMENT_WORKSPACE_DOCUMENT_VERSION_REFERENCE" }),
      ]),
    });
  });

  it("W07-20 permanent delete service delegates to central deletion registry", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/document-delete-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/getWorkspaceDocumentDeletionBlockers/);
    expect(src).toMatch(/canPermanentlyDeleteWorkspaceDocument/);
  });

  it("W07-21 task document link transaction locks parent document FOR UPDATE", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/FOR UPDATE/);
  });

  it("W07-22 requirement document link transaction locks parent document FOR UPDATE", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/requirements/requirement-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/FOR UPDATE/);
  });

  it("W07-23 link validation scopes documents by tenantId in prisma where", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/workspace-version-link-validation.ts"),
      "utf8",
    );
    expect(src).toMatch(/where:\s*\{\s*id:\s*documentId,\s*tenantId:\s*ctx\.tenantId/);
    expect(src).toMatch(/tenantId:\s*ctx\.tenantId[\s\S]*documentId:\s*document\.id/);
  });

  it("W07-24 link validation rejects versions not belonging to requested document", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/workspace-version-link-validation.ts"),
      "utf8",
    );
    expect(src).toMatch(/Version not found for document/);
    expect(src).toMatch(/documentId:\s*document\.id/);
  });

  it("W07-25 loadWorkspaceDocumentVersionForTenantValidation fails closed for foreign tenant", async () => {
    prismaMocks.workspaceDocumentVersion.findFirst.mockResolvedValueOnce(null);

    const { loadWorkspaceDocumentVersionForTenantValidation } = await import(
      "@/lib/workspace/reference/workspace-version-link-validation"
    );

    await expect(
      loadWorkspaceDocumentVersionForTenantValidation(
        { tenantId: TENANT, userId: "u1", permissionKeys: [] },
        "ver-other-tenant",
      ),
    ).rejects.toMatchObject({ name: "WorkspaceVersionLinkValidationError" });
  });

  it("W07-26 resolveWorkspaceDocumentVersionForLink defaults to current version when omitted", async () => {
    prismaMocks.workspaceDocument.findFirst.mockResolvedValueOnce({
      id: "doc-1",
      tenantId: TENANT,
      currentVersionId: "ver-current",
    });
    prismaMocks.workspaceDocumentVersion.findFirst.mockResolvedValueOnce({
      id: "ver-current",
      tenantId: TENANT,
      documentId: "doc-1",
      versionNumber: 2,
    });

    const { resolveWorkspaceDocumentVersionForLink } = await import(
      "@/lib/workspace/reference/workspace-version-link-validation"
    );

    const resolved = await resolveWorkspaceDocumentVersionForLink(
      { tenantId: TENANT, userId: "u1", permissionKeys: [] },
      { documentId: "doc-1" },
    );

    expect(resolved.workspaceDocumentVersionId).toBe("ver-current");
    expect(resolved.versionNumber).toBe(2);
  });

  it("W07-27 exact-version resolver zero-discloses unreadable documents", async () => {
    const { filterReadableWorkspaceDocumentIds } = await import(
      "@/lib/workspace/document-access"
    );
    vi.mocked(filterReadableWorkspaceDocumentIds).mockResolvedValueOnce(new Set());

    prismaMocks.workspaceDocumentVersion.findMany.mockResolvedValueOnce([
      {
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 1,
        document: {
          id: "doc-1",
          name: "Secret",
          status: WorkspaceDocumentStatus.ACTIVE,
          archivedAt: null,
          trashedAt: null,
        },
      },
    ]);

    const { resolveExactVersionReferencePresentations } = await import(
      "@/lib/workspace/reference/resolve-workspace-version-references"
    );

    const map = await resolveExactVersionReferencePresentations(
      { tenantId: TENANT, userId: "u1", permissionKeys: [] },
      [{ referenceId: "ref-1", workspaceDocumentVersionId: "ver-1" }],
    );

    expect(map.get("ref-1")).toEqual({ accessible: false, referenceId: "ref-1" });
  });

  it("W07-28 exact-version resolver exposes lifecycle for readable documents", async () => {
    const { filterReadableWorkspaceDocumentIds } = await import(
      "@/lib/workspace/document-access"
    );
    vi.mocked(filterReadableWorkspaceDocumentIds).mockResolvedValueOnce(new Set(["doc-1"]));

    prismaMocks.workspaceDocumentVersion.findMany.mockResolvedValueOnce([
      {
        id: "ver-1",
        documentId: "doc-1",
        versionNumber: 3,
        document: {
          id: "doc-1",
          name: "Policy",
          status: WorkspaceDocumentStatus.ARCHIVED,
          archivedAt: new Date(),
          trashedAt: null,
        },
      },
    ]);

    const { resolveExactVersionReferencePresentations } = await import(
      "@/lib/workspace/reference/resolve-workspace-version-references"
    );

    const map = await resolveExactVersionReferencePresentations(
      { tenantId: TENANT, userId: "u1", permissionKeys: [] },
      [{ referenceId: "ref-1", workspaceDocumentVersionId: "ver-1" }],
    );

    const presentation = map.get("ref-1");
    expect(presentation).toMatchObject({
      accessible: true,
      documentLifecycle: "ARCHIVED",
      versionNumber: 3,
    });
    expect(Object.keys(presentation ?? {})).not.toContain("storageKey");
  });

  it("W07-29 task reference resolver applies workspace readability filter (dual-domain auth)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/workspace/reference/resolve-workspace-version-references.ts"),
      "utf8",
    );
    expect(src).toMatch(/filterReadableWorkspaceDocumentIds/);
    expect(src).toMatch(/resolveTaskDocumentReferencePresentations/);
  });

  it("W07-30 requirement list resolves presentations via shared exact-version batch resolver", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/requirements/requirement-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/resolveExactVersionReferencePresentations/);
    expect(src.includes("storageKey")).toBe(false);
  });

  it("W07-31 CLOSED requirements reject document reference mutations", async () => {
    prismaMocks.requirement.findFirst.mockResolvedValueOnce({
      id: "req-1",
      tenantId: TENANT,
      status: RequirementStatus.CLOSED,
      createdByUserId: "u1",
    });

    const { linkRequirementDocumentReference } = await import(
      "@/lib/requirements/requirement-document-reference-service"
    );
    const { RequirementValidationError } = await import("@/lib/requirements/errors");

    await expect(
      linkRequirementDocumentReference(
        { tenantId: TENANT, userId: "u1", permissionKeys: [] },
        "req-1",
        { documentId: "doc-1", workspaceDocumentVersionId: "ver-1" },
      ),
    ).rejects.toBeInstanceOf(RequirementValidationError);
  });

  it("W07-32 CANCELLED requirements reject document reference mutations", async () => {
    prismaMocks.requirement.findFirst.mockResolvedValueOnce({
      id: "req-1",
      tenantId: TENANT,
      status: RequirementStatus.CANCELLED,
      createdByUserId: "u1",
    });

    const { unlinkRequirementDocumentReference } = await import(
      "@/lib/requirements/requirement-document-reference-service"
    );
    const { RequirementValidationError } = await import("@/lib/requirements/errors");

    await expect(
      unlinkRequirementDocumentReference(
        { tenantId: TENANT, userId: "u1", permissionKeys: [] },
        "req-1",
        "ref-1",
      ),
    ).rejects.toBeInstanceOf(RequirementValidationError);
  });

  it("W07-33 AUFGABEN-06G RequirementRecipient model remains unchanged by W07 migration", () => {
    const migration = readMigration();
    expect(migration.includes("RequirementRecipient")).toBe(false);
    const schema = readSchema();
    const recipientBlock = schema.slice(schema.indexOf("model RequirementRecipient"));
    expect(recipientBlock.includes("workspaceDocumentVersionId")).toBe(false);
    expect(recipientBlock).toMatch(/subjectPersonId/);
  });

  it("W07-34 acknowledgement identity requires immutable workspaceDocumentVersionId", () => {
    expect(() =>
      assertAcknowledgementVersionIdentity({ workspaceDocumentVersionId: "  " }),
    ).toThrow(/workspaceDocumentVersionId/);

    const identity: WorkspaceDocumentVersionAcknowledgementIdentity = {
      tenantId: TENANT,
      workspaceDocumentVersionId: "ver-1",
      acknowledgedAt: new Date().toISOString(),
    };
    expect(identity.workspaceDocumentVersionId).toBe("ver-1");
  });

  it("W07-35 acknowledgement identity seam documents version-only binding (no W07 workflow)", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/workspace/acknowledgement/document-version-acknowledgement-identity.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/no workflow in W07/);
    expect(src).toMatch(/never currentVersionId or symbolic "latest"/);
  });

  it("W07-36 shared picker confirms explicit workspaceDocumentVersionId", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/WorkspaceDocumentVersionReferencePicker.tsx"),
      "utf8",
    );
    expect(src).toMatch(/onConfirm:\s*\(input: \{ documentId: string; workspaceDocumentVersionId: string \}\)/);
    expect(src).toMatch(/workspaceDocumentVersionId: selectedVersionId/);
  });

  it("W07-37 picker UX states immutable chosen version (not auto-latest)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/WorkspaceDocumentVersionReferencePicker.tsx"),
      "utf8",
    );
    expect(src).toMatch(/dauerhaft verknüpft/);
    expect(src).toMatch(/nicht automatisch die\s*neueste/);
    expect(src).toMatch(/-version-select/);
  });

  it("W07-38 requirement references UI reuses shared version picker", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/aufgaben/RequirementDocumentReferencesSection.tsx"),
      "utf8",
    );
    expect(src).toMatch(/WorkspaceDocumentVersionReferencePicker/);
    expect(src).toMatch(/listRequirementDocumentVersionsForLinkAction/);
  });

  it("W07-39 w07-readiness re-exports deletion blocker registry", async () => {
    const readiness = await import("@/lib/workspace/deletion/w07-readiness");
    expect(readiness.WORKSPACE_DELETION_BLOCKED_CODE).toBe(WORKSPACE_DELETION_BLOCKED_CODE);
    expect(readiness.getWorkspaceDocumentDeletionBlockers).toBe(
      getWorkspaceDocumentDeletionBlockers,
    );
  });

  it("W07-40 task reference DTO exposes presentation without storage fields", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/presentation: WorkspaceVersionReferencePresentation/);
    expect(src.includes("storageKey")).toBe(false);
    expect(src.includes("storageUrl")).toBe(false);
  });

  it("W07-41 requirement reference edit path enforces manage authority (dual auth)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/requirements/requirement-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/canManageRequirement/);
    expect(src).toMatch(/canReadRequirement/);
  });

  it("W07-42 requirement link maps workspace validation failures to linkable error", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/requirements/requirement-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/WorkspaceVersionLinkValidationError/);
    expect(src).toMatch(/WORKSPACE_DOCUMENT_LINKABLE_ERROR/);
  });

  it("W07-43 permanent delete rejects requirement exact-version reference blockers", async () => {
    prismaMocks.requirementWorkspaceDocumentVersionReference.findMany.mockResolvedValueOnce([
      { id: "req-ref" },
    ]);
    prismaMocks.workspaceDocumentFindFirstDelete.mockResolvedValueOnce({
      id: "doc-1",
      name: "Doc",
      versions: [{ storageKey: "k1" }],
    });

    const { deleteWorkspaceDocumentPermanently } = await import(
      "@/lib/workspace/document-delete-service"
    );

    await expect(deleteWorkspaceDocumentPermanently(TENANT, "doc-1")).rejects.toMatchObject({
      code: WORKSPACE_DELETION_BLOCKED_CODE,
    });
    expect(prismaMocks.workspaceDocumentDelete).not.toHaveBeenCalled();
  });

  it("W07-44 task resolver returns legacy_unresolved when readable but version unknown", async () => {
    const { filterReadableWorkspaceDocumentIds } = await import(
      "@/lib/workspace/document-access"
    );
    vi.mocked(filterReadableWorkspaceDocumentIds).mockResolvedValueOnce(new Set(["doc-1"]));

    prismaMocks.workspaceDocument.findMany.mockResolvedValueOnce([
      {
        id: "doc-1",
        name: "Legacy Doc",
        status: WorkspaceDocumentStatus.ACTIVE,
        archivedAt: null,
        trashedAt: null,
      },
    ]);

    const { resolveTaskDocumentReferencePresentations } = await import(
      "@/lib/workspace/reference/resolve-workspace-version-references"
    );

    const presentations = await resolveTaskDocumentReferencePresentations(
      { tenantId: TENANT, userId: "u1", permissionKeys: [] },
      [
        {
          referenceId: "legacy-ref",
          documentId: "doc-1",
          workspaceDocumentVersionId: null,
          versionBinding: TaskDocumentReferenceVersionBinding.LEGACY_UNRESOLVED,
        },
      ],
    );

    expect(presentations.get("legacy-ref")).toMatchObject({
      accessible: "legacy_unresolved",
      documentId: "doc-1",
      message: expect.stringContaining("genaue Dokumentversion nicht bestimmt"),
    });
  });

  it("W07-45 lifecycle derivation stays consistent for archived documents in resolver", () => {
    const lifecycle = deriveWorkspaceDocumentLifecycle({
      status: WorkspaceDocumentStatus.ARCHIVED,
      archivedAt: new Date(),
      trashedAt: null,
    });
    expect(lifecycle).toBe("ARCHIVED");
  });

  it("W07-46 legacy task unlink by documentId targets unresolved rows only", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/tasks/task-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/workspaceDocumentVersionId: null/);
    expect(src).toMatch(/documentId: key/);
  });

  it("W07-47 migration replaces coarse taskId-documentId uniqueness with partial indexes", () => {
    const migration = readMigration();
    expect(migration).toMatch(/DROP INDEX IF EXISTS "TaskDocumentReference_taskId_documentId_key"/);
    expect(migration).toMatch(/TaskDocumentReference_taskId_workspaceDocumentVersionId_key/);
    expect(migration).toMatch(/TaskDocumentReference_taskId_documentId_legacy_key/);
  });

  it("W07-48 requirement link audit record stores exact version identity", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/requirements/requirement-document-reference-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/REQUIREMENT_DOCUMENT_LINKED/);
    expect(src).toMatch(/workspaceDocumentVersionId: resolved\.workspaceDocumentVersionId/);
  });
});
