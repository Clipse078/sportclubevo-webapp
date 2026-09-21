/**
 * AUFGABEN-06D — task document reference service.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType, TaskVisibilityScope } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskValidationError } from "../errors";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  referenceFindMany: vi.fn(),
  referenceCreateMany: vi.fn(),
  referenceDeleteMany: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
  assertLinkable: vi.fn(),
  resolvePresentations: vi.fn(),
  searchDocuments: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: { findFirst: mocks.taskFindFirst },
    taskDocumentReference: {
      findMany: mocks.referenceFindMany,
      createMany: mocks.referenceCreateMany,
      deleteMany: mocks.referenceDeleteMany,
    },
    $transaction: mocks.transaction,
    auditLog: { create: mocks.auditCreate },
  },
}));

vi.mock("@/lib/workspace/document-access", () => ({
  assertWorkspaceDocumentLinkable: mocks.assertLinkable,
  resolveWorkspaceDocumentPresentations: mocks.resolvePresentations,
  searchWorkspaceDocumentsForTaskLink: mocks.searchDocuments,
  WORKSPACE_DOCUMENT_LINKABLE_ERROR: "Das Dokument ist nicht verfügbar oder kann nicht verknüpft werden.",
}));

import {
  canEditTaskDocumentReferences,
  linkTaskDocument,
  listTaskDocumentReferences,
  unlinkTaskDocument,
} from "../task-document-reference-service";

const TENANT = "tenant-a";
const TASK = "task-1";
const DOC = "doc-1";
const CREATOR = "creator-1";
const ASSIGNEE = "assignee-1";

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK,
    tenantId: TENANT,
    title: "Vorstandssitzung vorbereiten",
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

function ctx(userId: string, permissionKeys: string[]) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

describe("AUFGABEN-06D task-document-reference-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindFirst.mockResolvedValue(taskRow());
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        taskDocumentReference: { createMany: mocks.referenceCreateMany },
        auditLog: { create: mocks.auditCreate },
      }),
    );
    mocks.referenceCreateMany.mockResolvedValue({ count: 1 });
    mocks.referenceDeleteMany.mockResolvedValue({ count: 1 });
    mocks.assertLinkable.mockResolvedValue(undefined);
    mocks.resolvePresentations.mockResolvedValue(
      new Map([
        [
          DOC,
          {
            access: "readable",
            documentId: DOC,
            title: "Budget",
            folderBreadcrumb: null,
            href: `/dashboard/workspace?document=${DOC}`,
          },
        ],
      ]),
    );
  });

  it("assignee without metadata-edit authority cannot link", () => {
    expect(
      canEditTaskDocumentReferences(
        ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]),
        {
          tenantId: TENANT,
          createdByUserId: CREATOR,
          assigneeUserIds: [ASSIGNEE],
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          orgUnitId: null,
        },
      ),
    ).toBe(false);
  });

  it("creator with tasks.create can link", () => {
    expect(
      canEditTaskDocumentReferences(
        ctx(CREATOR, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE]),
        {
          tenantId: TENANT,
          createdByUserId: CREATOR,
          assigneeUserIds: [ASSIGNEE],
          visibilityScope: TaskVisibilityScope.ASSIGNEES_ONLY,
          orgUnitId: null,
        },
      ),
    ).toBe(true);
  });

  it("rejects duplicate primary DOCUMENT context document", async () => {
    mocks.taskFindFirst.mockResolvedValue(
      taskRow({ contextType: TaskContextType.DOCUMENT, contextId: DOC }),
    );
    await expect(
      linkTaskDocument(
        ctx(CREATOR, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE]),
        TASK,
        DOC,
      ),
    ).rejects.toThrow(TaskValidationError);
  });

  it("denies link when document is not linkable", async () => {
    mocks.assertLinkable.mockRejectedValue(new Error("blocked"));
    await expect(
      linkTaskDocument(
        ctx(CREATOR, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.WORKSPACE_VIEW]),
        TASK,
        DOC,
      ),
    ).rejects.toThrow(TaskValidationError);
  });

  it("lists references with batched presentation resolution", async () => {
    mocks.referenceFindMany.mockResolvedValue([
      { id: "ref-1", documentId: DOC, createdAt: new Date("2026-09-21T10:00:00.000Z") },
    ]);
    const rows = await listTaskDocumentReferences(
      ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.WORKSPACE_VIEW]),
      TASK,
    );
    expect(rows).toHaveLength(1);
    expect(mocks.resolvePresentations).toHaveBeenCalledWith(
      expect.anything(),
      [DOC],
    );
    expect(rows[0]?.presentation.access).toBe("readable");
  });

  it("unlink requires metadata-edit authority", async () => {
    await expect(
      unlinkTaskDocument(ctx(ASSIGNEE, [PERMISSIONS.TASKS_VIEW]), TASK, DOC),
    ).rejects.toThrow(TaskForbiddenError);
  });

  it("link is idempotent when duplicate reference exists", async () => {
    mocks.referenceCreateMany.mockResolvedValue({ count: 0 });
    await linkTaskDocument(
      ctx(CREATOR, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_CREATE, PERMISSIONS.WORKSPACE_VIEW]),
      TASK,
      DOC,
    );
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
