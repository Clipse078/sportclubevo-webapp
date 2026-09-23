/**
 * AUFGABEN-06D — document reference security sentinels (R1–R46).
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  canReadTask,
  EMPTY_TASK_AUTH_SCOPE,
  type TaskAuthorizationRecord,
} from "../task-authorization";
import { canEditTaskDocumentReferences as canEditRefs } from "../task-document-reference-service";
import { mapAuditLogToTimelineEntry } from "../task-timeline-mapper";
import { MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT } from "@/lib/workspace/document-access";

const TENANT = "tenant-a";
const CREATOR = "creator";
const ASSIGNEE = "assignee";
const OTHER = "other";

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

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("AUFGABEN-06D authorization matrix", () => {
  it("R18 assignee without metadata-edit authority cannot link", () => {
    expect(canEditRefs(serviceCtx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(false);
  });

  it("R19 creator + tasks.create can link", () => {
    expect(
      canEditRefs(
        serviceCtx(CREATOR, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE]),
        authRecord(),
      ),
    ).toBe(true);
  });

  it("R20 canManageTask-authorized user can link", () => {
    expect(
      canEditRefs(
        serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_MANAGE]),
        authRecord({ visibilityScope: TaskVisibilityScope.CLUB }),
      ),
    ).toBe(true);
  });

  it("R21 task access never grants document access (static)", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    expect(source).toMatch(/resolveWorkspaceDocumentVersionForLink/);
    expect(source).not.toMatch(/canReadTask\([\s\S]*documentId/);
  });

  it("R23 TaskDocumentReference is not consulted by canReadTask", () => {
    for (const rel of ["lib/tasks/task-authorization.ts", "lib/tasks/task-access.ts", "lib/tasks/visibility.ts"]) {
      expect(read(rel)).not.toMatch(/TaskDocumentReference|taskDocumentReference/);
    }
  });
});

describe("AUFGABEN-06D integration guards", () => {
  it("R39 workspace UI section placement", () => {
    const source = read("components/admin/aufgaben/TaskWorkspace.tsx");
    expect(source).toContain("TaskDocumentReferencesSection");
    const contextMarker = "<TaskContextSection";
    const documentsMarker = "<TaskDocumentReferencesSection";
    const activityMarker = "<TaskActivitySection";
    expect(source.indexOf(contextMarker)).toBeGreaterThan(-1);
    expect(source.indexOf(documentsMarker)).toBeGreaterThan(source.indexOf(contextMarker));
    expect(source.indexOf(activityMarker)).toBeGreaterThan(source.indexOf(documentsMarker));
  });

  it("R31 reference service batches document presentation", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    expect(source).toMatch(/resolveTaskDocumentReferencePresentations/);
    expect(source).not.toMatch(/for\s*\([^)]*reference[^)]*\)[\s\S]*canReadWorkspaceDocument/);
  });

  it("R43 restricted metadata absent from client row rendering", () => {
    const source = read("components/admin/aufgaben/TaskDocumentReferencesSection.tsx");
    expect(source).toContain("presentation.accessible === false");
    expect(source).toContain("Dokument (kein Zugriff)");
    const restrictedBlock =
      source.split("presentation.accessible === false")[1]?.split("return (")[1]?.split(");")[0] ?? "";
    expect(restrictedBlock).not.toMatch(/presentation\.title|href=/);
  });

  it("R25 audit stores documentId only", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    const linkedAudit =
      source.split("action: \"TASK_DOCUMENT_LINKED\"")[1]?.split("});")[0] ?? "";
    expect(linkedAudit).toMatch(/documentId:/);
    expect(linkedAudit).toMatch(/workspaceDocumentVersionId:/);
    expect(linkedAudit).not.toMatch(/filename|documentTitle|storageKey/);
  });

  it("R26 timeline uses generic document wording", () => {
    const entry = mapAuditLogToTimelineEntry(
      {
        id: "a1",
        actorUserId: CREATOR,
        action: "TASK_DOCUMENT_LINKED",
        beforeJson: null,
        afterJson: { documentId: "doc-1" },
        createdAt: new Date("2026-09-21T10:00:00.000Z"),
      },
      "Max Muster",
      new Map(),
    );
    expect(entry.title).toContain("Dokument verknüpft");
    expect(entry.title).not.toContain("doc-1");
    expect(JSON.stringify(entry)).not.toMatch(/Trainershandbuch/);
  });

  it("R40 workspace page honors ?document= with document-access seam", () => {
    const source = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(source).toMatch(/canReadWorkspaceDocument|resolveWorkspaceDocumentDirectLinkAccess/);
    expect(source).toContain("documentParam");
  });

  it("R44 unlink does not mutate workspace documents", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    const unlinkBlock = source.split("export async function unlinkTaskDocument")[1] ?? "";
    expect(unlinkBlock).toMatch(/taskDocumentReference\.deleteMany/);
    expect(unlinkBlock).not.toMatch(/workspaceDocument\.|documentArchive|documentDelete/);
  });

  it("R28 picker max limit exported", () => {
    expect(MAX_WORKSPACE_DOCUMENT_PICKER_LIMIT).toBeLessThanOrEqual(50);
  });

  it("R16 primary DOCUMENT duplicate rejected in service", () => {
    const source = read("lib/tasks/task-document-reference-service.ts");
    const primaryContext = read("lib/tasks/task-primary-document-context.ts");
    expect(source).toMatch(/assertNotPrimaryDocumentDuplicate/);
    expect(source).toMatch(/isTaskPrimaryDocumentContext/);
    expect(primaryContext).toMatch(/TaskContextType\.DOCUMENT/);
  });

  it("R45 DOCUMENT context picker uses document-access search", () => {
    const source = read("lib/tasks/task-context-registry.ts");
    expect(source).toMatch(/searchWorkspaceDocumentsForTaskLink/);
  });

  it("R46 archived DOCUMENT context degrades in batch resolution", () => {
    const source = read("lib/tasks/context-resolution.ts");
    expect(source).toMatch(/archivedAt !== null/);
    expect(source).toMatch(/TASK_CONTEXT_UNAVAILABLE_LABEL/);
  });

  it("R13/R14 cascade defined in migration", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    expect(sql).toMatch(/ON DELETE CASCADE/);
    expect(sql).toMatch(/TaskDocumentReference_taskId_fkey/);
    expect(sql).toMatch(/TaskDocumentReference_documentId_fkey/);
    expect(sql).not.toMatch(/DROP TABLE/);
  });

  it("R32/R33 references scoped to concrete task model only", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/model TaskDocumentReference/);
    expect(schema).not.toMatch(/TaskSeriesDocumentReference/);
  });
});

describe("AUFGABEN-06D non-grant matrix", () => {
  it("R22 document access never grants task access", () => {
    expect(canReadTask(serviceCtx(OTHER, [PERMISSIONS.WORKSPACE_VIEW]), authRecord())).toBe(false);
    expect(canEditRefs(serviceCtx(OTHER, [PERMISSIONS.WORKSPACE_VIEW]), authRecord())).toBe(false);
  });

  it("R12 unreadable task cannot use reference mutations", () => {
    expect(canEditRefs(serviceCtx(OTHER, [PERMISSIONS.TASKS_VIEW]), authRecord())).toBe(false);
  });
});

describe("AUFGABEN-06D migration safety", () => {
  it("R7 additive migration hash pinned", () => {
    const sql = read(
      "prisma/migrations/20260921193000_aufgaben_06d_document_references/migration.sql",
    );
    const hash = createHash("sha256").update(sql).digest("hex");
    expect(hash).toBe(
      "4919f4b45121183a395505a60b8a9ada9635aebc2d60e74584913bcffb0287f0",
    );
    expect(sql).toContain("CREATE TABLE \"TaskDocumentReference\"");
  });
});
