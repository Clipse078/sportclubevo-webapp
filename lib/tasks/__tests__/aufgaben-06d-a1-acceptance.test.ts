/**
 * AUFGABEN-06D-A1 — explicit acceptance + adversarial hardening (R1–R46, A1–A16).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildTaskReadWhere,
  buildTaskSeriesReadWhere,
  canManageTask,
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { TaskForbiddenError } from "../errors";
import { mapAuditLogToTimelineEntry } from "../task-timeline-mapper";

const LINKABLE_ERROR = vi.hoisted(
  () => "Das Dokument ist nicht verfügbar oder kann nicht verknüpft werden.",
);

const refMocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  referenceFindMany: vi.fn(),
  referenceFindFirst: vi.fn(),
  referenceCreateMany: vi.fn(),
  referenceDeleteMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
  resolveVersionForLink: vi.fn(),
  resolveTaskPresentations: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: refMocks.taskFindFirst },
    taskDocumentReference: {
      findMany: refMocks.referenceFindMany,
      findFirst: refMocks.referenceFindFirst,
      createMany: refMocks.referenceCreateMany,
      deleteMany: refMocks.referenceDeleteMany,
    },
    $transaction: refMocks.transaction,
    auditLog: { create: refMocks.auditCreate },
  },
}));

vi.mock("@/lib/workspace/reference/workspace-version-link-validation", () => ({
  resolveWorkspaceDocumentVersionForLink: refMocks.resolveVersionForLink,
  listAuthorizedWorkspaceDocumentVersions: vi.fn(),
  WorkspaceVersionLinkValidationError: class WorkspaceVersionLinkValidationError extends Error {},
}));

vi.mock("@/lib/workspace/reference/resolve-workspace-version-references", () => ({
  resolveTaskDocumentReferencePresentations: refMocks.resolveTaskPresentations,
}));

vi.mock("@/lib/workspace/document-access", () => ({
  searchWorkspaceDocumentsForTaskLink: vi.fn(),
  WORKSPACE_DOCUMENT_LINKABLE_ERROR: LINKABLE_ERROR,
  MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT: 50,
}));

import {
  canEditTaskDocumentReferences,
  linkTaskDocument,
  listTaskDocumentReferences,
  type TaskDocumentReferenceDto,
} from "../task-document-reference-service";
import { requireVisibleTask } from "../task-access";

const TENANT = "tenant-a";
const TASK = "task-1";
const DOC = "doc-1";
const CREATOR = "creator-1";
const ASSIGNEE = "assignee-1";
const OUTSIDER = "outsider-1";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function authRecord(overrides: Partial<TaskAuthorizationRecord> = {}): TaskAuthorizationRecord {
  return {
    tenantId: TENANT,
    createdByUserId: CREATOR,
    assigneeUserIds: [ASSIGNEE],
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    orgUnitId: null,
    ...overrides,
  };
}

function serviceCtx(userId: string, permissionKeys: string[]) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Task",
    visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
    createdByUserId: CREATOR,
    contextType: TaskContextType.MEETING,
    contextId: "meeting-1",
    orgUnitId: null,
    orgUnit: null,
    assignees: [
      {
        userId: ASSIGNEE,
        assignedAt: new Date(),
        user: { id: ASSIGNEE, firstName: "A", lastName: "B" },
      },
    ],
    ...overrides,
  };
}

describe("AUFGABEN-06D-A1 schema & migration (R1–R11)", () => {
  it("R1 TaskDocumentReference model is additive", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/model TaskDocumentReference/);
  });

  it("R2 evolved to reference WorkspaceDocumentVersion for exact links", () => {
    const block =
      read("prisma/schema.prisma").match(/model TaskDocumentReference[\s\S]*?^}/m)?.[0] ?? "";
    expect(block).toMatch(/workspaceDocumentVersion\s+WorkspaceDocumentVersion/);
    expect(block).toMatch(/document\s+WorkspaceDocument\?/);
  });

  it("R3/R4 tenant + unique task/version pair for exact references", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/tenantId\s+String/);
    expect(schema).toMatch(/@@unique\(\[taskId, workspaceDocumentVersionId\]\)/);
  });

  it("R5 accepted indexes on tenant and lookup keys", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    expect(sql).toMatch(/TaskDocumentReference_tenantId_idx/);
    expect(sql).toMatch(/TaskDocumentReference_tenantId_taskId_idx/);
    expect(sql).toMatch(/TaskDocumentReference_tenantId_documentId_idx/);
  });

  it("R6 migration is additive only", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN|ALTER TABLE.*DROP/);
  });

  it("R8 creator deletion uses SET NULL", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    expect(sql).toMatch(/createdByUserId_fkey[\s\S]*ON DELETE SET NULL/);
  });

  it("R9 tenant delete cascades references", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    expect(sql).toMatch(/TaskDocumentReference_tenantId_fkey[\s\S]*ON DELETE CASCADE/);
  });

  it("R10/R11 service scopes by ctx.tenantId and taskId", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    expect(source).toMatch(/where: \{ tenantId: ctx\.tenantId, taskId \}/);
    expect(source).toMatch(/tenantId: ctx\.tenantId,\s*\n\s*taskId,/);
  });
});

describe("AUFGABEN-06D-A1 link authorization matrix (R17–R22)", () => {
  it("R17/R22 super admin without task read cannot link references", () => {
    expect(
      canEditTaskDocumentReferences(
        {
          ...serviceCtx("super-admin", [PERMISSIONS.TASKS_VIEW, PERMISSIONS.WORKSPACE_VIEW]),
          auth: { ...EMPTY_TASK_AUTH_SCOPE, isSuperAdmin: true },
        },
        authRecord(),
      ),
    ).toBe(false);
  });
});

describe("AUFGABEN-06D-A1 authorization independence (A1–A2, R23)", () => {
  it("A1 TaskDocumentReference never affects canReadTask/canManageTask/read where", () => {
    for (const rel of [
      "lib/tasks/task-authorization.ts",
      "lib/tasks/task-access.ts",
      "lib/tasks/visibility.ts",
    ]) {
      expect(read(rel)).not.toMatch(/TaskDocumentReference|taskDocumentReference/);
    }
    expect(JSON.stringify(buildTaskReadWhere(serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW])))).not.toMatch(
      /TaskDocumentReference/,
    );
    expect(JSON.stringify(buildTaskSeriesReadWhere(serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW])))).not.toMatch(
      /TaskDocumentReference/,
    );
    expect(canReadTask(serviceCtx(OUTSIDER, [PERMISSIONS.WORKSPACE_VIEW]), authRecord())).toBe(false);
    expect(canManageTask(serviceCtx(CREATOR, [PERMISSIONS.TASKS_MANAGE]), authRecord())).toBe(false);
  });

  it("A2 document seam ignores Task relationships as grants", () => {
    const seam = read("lib/workspace/document-access.ts");
    expect(seam).not.toMatch(
      /TaskDocumentReference|TaskAssignee|TaskFollower|TaskComment|TaskCommentMention|visibilityScope|orgUnitId/,
    );
  });
});

describe("AUFGABEN-06D-A1 metadata & errors (A3–A4, R17, R29, R43)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refMocks.taskFindFirst.mockResolvedValue(taskRow());
    refMocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        taskDocumentReference: { createMany: refMocks.referenceCreateMany },
        auditLog: { create: refMocks.auditCreate },
        $executeRaw: vi.fn(),
      }),
    );
    refMocks.referenceCreateMany.mockResolvedValue({ count: 1 });
    refMocks.resolveVersionForLink.mockResolvedValue({
      tenantId: TENANT,
      documentId: DOC,
      workspaceDocumentVersionId: "ver-1",
      versionNumber: 1,
    });
  });

  it("A3 restricted reference DTO exposes no confidential metadata fields", async () => {
    refMocks.referenceFindMany.mockResolvedValue([
      {
        id: "ref-1",
        documentId: null,
        workspaceDocumentVersionId: "ver-1",
        versionBinding: "EXACT",
        createdAt: new Date("2026-09-21T10:00:00.000Z"),
      },
    ]);
    refMocks.resolveTaskPresentations.mockResolvedValue(
      new Map([["ref-1", { accessible: false, referenceId: "ref-1" }]]),
    );

    const rows = await listTaskDocumentReferences(
      serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.WORKSPACE_VIEW]),
      TASK,
    );
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toMatch(/storageKey|storageUrl|mimeType|sizeBytes|createdBy/);
    expect(rows[0]?.presentation).toEqual({ accessible: false, referenceId: "ref-1" });
  });

  it("A4 link failures use one generic message for missing/foreign/unreadable", async () => {
    const ctx = serviceCtx(CREATOR, [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.TASKS_CREATE,
      PERMISSIONS.WORKSPACE_VIEW,
    ]);
    const { WorkspaceVersionLinkValidationError } = await import(
      "@/lib/workspace/reference/workspace-version-link-validation"
    );
    for (const reason of ["missing", "foreign-tenant", "permission-denied", "archived"]) {
      refMocks.resolveVersionForLink.mockRejectedValueOnce(new WorkspaceVersionLinkValidationError(reason));
      await expect(linkTaskDocument(ctx, TASK, { documentId: DOC })).rejects.toMatchObject({
        name: "TaskValidationError",
        message: LINKABLE_ERROR,
      });
    }
  });

  it("R29/A13 reference DTO never includes createdBy identity", () => {
    const dtoBlock =
      read("lib/tasks/task-document-reference-service.ts").split(
        "export type TaskDocumentReferenceDto",
      )[1]?.split("};")[0] ?? "";
    expect(dtoBlock).toMatch(/referenceId: string/);
    expect(dtoBlock).not.toMatch(/createdByUserId|createdBy|firstName|lastName/);
    const rows: TaskDocumentReferenceDto[] = [
      {
        referenceId: "r1",
        linkedAt: "2026-09-21T10:00:00.000Z",
        presentation: { accessible: false, referenceId: "r1" },
      },
    ];
    expect(JSON.stringify(rows)).not.toMatch(/createdBy|firstName|lastName|email/);
  });
});

describe("AUFGABEN-06D-A1 integrity & side effects (A5–A10, R15, R24, R30–R38)", () => {
  it("A5/A6 cascade deletes reference only — Task and WorkspaceDocument survive each other", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    expect(sql).toMatch(/TaskDocumentReference_taskId_fkey[\s\S]*ON DELETE CASCADE/);
    expect(sql).toMatch(/TaskDocumentReference_documentId_fkey[\s\S]*ON DELETE CASCADE/);
    expect(sql).not.toMatch(/DELETE FROM \"Task\"/);
    expect(sql).not.toMatch(/DELETE FROM \"WorkspaceDocument\"/);
  });

  it("A7 unlink path deletes reference + audit only", () => {
    const unlink = read("lib/tasks/task-document-reference-service.ts").split(
      "export async function unlinkTaskDocumentReference",
    )[1];
    expect(unlink).toMatch(/taskDocumentReference\.deleteMany/);
    expect(unlink).not.toMatch(/workspaceDocument\.|WorkspaceDocumentVersion\.|storage|archiveDocument/);
  });

  it("A8 link/unlink emits no Notification side effects", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    expect(source).not.toMatch(/notification|NotificationDelivery|sendEmail|emitTask/);
  });

  it("A9 link/unlink does not mutate followers/comments/assignees", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    expect(source).not.toMatch(/taskFollower|taskComment|TaskCommentMention|taskAssignee/);
  });

  it("A10 Phase-10 seam — reference service has no direct workspace permission checks", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    expect(source).not.toMatch(/WORKSPACE_VIEW|workspace\.view|hasPermission\(|requirePermission\(/);
    expect(source).toMatch(/@\/lib\/workspace\/reference\//);
  });

  it("A11 workspace deep link does not consult TaskDocumentReference", () => {
    const page = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(page).toMatch(
      /canReadWorkspaceDocument|resolveWorkspaceDocumentDirectLinkAccess/,
    );
    expect(page).not.toMatch(/TaskDocumentReference|taskDocumentReference/);
  });

  it("R15 duplicate pair is idempotent via skipDuplicates", () => {
    expect(read("lib/tasks/task-document-reference-service.ts")).toMatch(/skipDuplicates: true/);
  });

  it("R24 unlink audit stores ids only — no document title or storage metadata", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    const unlink = source.split("TASK_DOCUMENT_UNLINKED")[1] ?? "";
    expect(unlink).toMatch(/afterJson:[\s\S]*workspaceDocumentVersionId|documentId|referenceId/);
    expect(unlink).not.toMatch(/name|filename|folder|storage|mime|size/);
  });

  it("R30/A14 reference list is not silently capped", () => {
    const listBlock = read("lib/tasks/task-document-reference-service.ts").split(
      "listTaskDocumentReferences",
    )[1];
    expect(listBlock).toMatch(/findMany\([\s\S]*where: \{ tenantId: ctx\.tenantId, taskId \}/);
    expect(listBlock).not.toMatch(/take:\s*\d+/);
  });

  it("R34–R38 references isolated from recurrence/subtasks/personal actions/agenda", () => {
    for (const rel of [
      "lib/tasks/task-series-service.ts",
      "lib/personal-agenda/task-projections.ts",
      "lib/personal-agenda/load-personal-agenda.ts",
      "lib/tasks/subtask-rules.ts",
    ]) {
      expect(read(rel)).not.toMatch(/TaskDocumentReference|taskDocumentReference/);
    }
    const workspace = read("lib/tasks/workspace-service.ts");
    expect(workspace).toMatch(/listTaskDocumentReferencesForVisibleTask\(ctx, visibleTask\)/);
    expect(
      workspace.match(/listTaskDocumentReferencesForVisibleTask\(ctx, visibleTask\)/g)?.length,
    ).toBe(1);
  });
});

describe("AUFGABEN-06D-A1 access loss & deep link (R21, R40)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refMocks.taskFindFirst.mockResolvedValue(taskRow());
  });

  it("document access loss hides metadata while reference remains listed", async () => {
    refMocks.referenceFindMany.mockResolvedValue([
      {
        id: "ref-1",
        documentId: DOC,
        workspaceDocumentVersionId: null,
        versionBinding: "LEGACY_UNRESOLVED",
        createdAt: new Date("2026-09-21T10:00:00.000Z"),
      },
    ]);
    refMocks.resolveTaskPresentations.mockResolvedValue(
      new Map([["ref-1", { accessible: false, referenceId: "ref-1" }]]),
    );

    const rows = await listTaskDocumentReferences(
      serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.WORKSPACE_VIEW]),
      TASK,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.presentation.accessible).toBe(false);
    if (rows[0]?.presentation.accessible === false) {
      expect(rows[0].presentation).not.toHaveProperty("canonicalWorkspaceUrl");
      expect(rows[0].presentation).not.toHaveProperty("documentTitle");
    }
  });

  it("task access loss blocks workspace load via requireVisibleTask", async () => {
    refMocks.taskFindFirst.mockResolvedValue(taskRow());
    await expect(
      requireVisibleTask(serviceCtx(OUTSIDER, [PERMISSIONS.TASKS_VIEW]), TASK),
    ).rejects.toThrow(TaskForbiddenError);
  });
});

describe("AUFGABEN-06D-A1 cardinality (A15–A16, R4)", () => {
  it("A15/A16 many-to-many cardinality without accidental unique(taskId) or unique(documentId)", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/@@unique\(\[taskId, workspaceDocumentVersionId\]\)/);
    expect(schema).not.toMatch(/@@unique\(\[taskId\]\)/);
    expect(schema).not.toMatch(/@@unique\(\[documentId\]\)/);
  });
});

describe("AUFGABEN-06D-A1 timeline & audit (R25–R26)", () => {
  it("R26 unlink timeline uses generic label without document title", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a2",
        actorUserId: CREATOR,
        action: "TASK_DOCUMENT_UNLINKED",
        beforeJson: null,
        afterJson: { documentId: DOC },
        createdAt: new Date("2026-09-21T10:00:00.000Z"),
      },
      "Max Muster",
      new Map(),
    );
    expect(entry.title).toContain("Dokument entfernt");
    expect(entry.title).not.toContain(DOC);
  });
});

describe("AUFGABEN-06D-A1 historical DOCUMENT context (A12, R46)", () => {
  it("A12 archived DOCUMENT context degrades without title/href leakage", () => {
    const source = read("lib/tasks/context-resolution.ts");
    expect(source).toMatch(/archivedAt !== null/);
    expect(source).toMatch(/TASK_CONTEXT_UNAVAILABLE_LABEL/);
    expect(source).toMatch(/resolveWorkspaceDocumentPresentations/);
  });
});

describe("AUFGABEN-06D-A1 wiring (R41–R42)", () => {
  it("R41 server actions delegate to reference service", () => {
    const actions = read("app/(admin)/dashboard/aufgaben/actions.ts");
    expect(actions).toMatch(/export async function linkTaskDocumentAction/);
    expect(actions).toMatch(/export async function unlinkTaskDocumentAction/);
    expect(actions).toMatch(/await linkTaskDocument\(ctx, taskId, input\)/);
  });

  it("R42 workspace bundle loads documentReferences for the requested task", () => {
    const source = read("lib/tasks/workspace-service.ts");
    expect(source).toMatch(/documentReferences: TaskDocumentReferenceDto\[\]/);
    expect(source).toMatch(/listTaskDocumentReferencesForVisibleTask\(ctx, visibleTask\)/);
  });
});
