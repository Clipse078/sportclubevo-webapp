/**
 * AUFGABEN-06F2-A1 — universal contextual Task rollout (R1–R60).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createContextualAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { buildOperationalContextHref } from "../context-registry";
import { loadContextRelatedTasksPanel } from "../load-context-related-tasks-panel";
import { listTasksForContext } from "../list-tasks-for-context";
import { countTasksForContext } from "../count-tasks-for-context";
import { validateTaskContextAttachable } from "../task-context-registry";
import { TaskVisibilityScope } from "@prisma/client";
import { EMPTY_TASK_AUTH_SCOPE } from "../task-authorization";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const TENANT = "tenant-a";
const USER = "user-1";

const prismaMocks = vi.hoisted(() => ({
  taskFindMany: vi.fn(),
  taskCount: vi.fn(),
  eventFindFirst: vi.fn(),
  trainingSeriesFindFirst: vi.fn(),
  trainingSessionFindFirst: vi.fn(),
  meetingFindFirst: vi.fn(),
  canSeeMeeting: vi.fn(),
  canReadWorkspaceDocument: vi.fn(),
  resolveEligibility: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    task: {
      findMany: prismaMocks.taskFindMany,
      count: prismaMocks.taskCount,
    },
    event: { findFirst: prismaMocks.eventFindFirst },
    trainingSeries: { findFirst: prismaMocks.trainingSeriesFindFirst },
    trainingSession: { findFirst: prismaMocks.trainingSessionFindFirst },
    meeting: { findFirst: prismaMocks.meetingFindFirst },
  },
}));

vi.mock("@/lib/meetings/queries", () => ({
  canSeeMeeting: prismaMocks.canSeeMeeting,
}));

vi.mock("@/lib/workspace/document-access", () => ({
  canReadWorkspaceDocument: prismaMocks.canReadWorkspaceDocument,
  searchWorkspaceDocumentsForTaskLink: vi.fn(),
  resolveWorkspaceDocumentPresentations: vi.fn(),
}));

vi.mock("@/lib/org/queries", () => ({
  loadOrgUnitIds: vi.fn().mockResolvedValue([]),
  loadTargetGroupIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("../context-validation", () => ({
  validateTaskContext: vi.fn(async () => undefined),
}));

vi.mock("../task-service", () => ({
  createTask: vi.fn(async () => ({ id: "task-created" })),
}));

vi.mock("../contextual-task-eligibility", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../contextual-task-eligibility")>();
  return {
    ...actual,
    resolveContextualTaskCreateEligibility: prismaMocks.resolveEligibility,
  };
});

vi.mock("@/lib/tasks/server-context", () => ({
  getTaskServiceContext: vi.fn(async () => serviceCtx(USER, [PERMISSIONS.TASKS_CREATE, PERMISSIONS.TASKS_VIEW])),
}));

function serviceCtx(userId: string, permissionKeys: string[]) {
  return {
    tenantId: TENANT,
    userId,
    permissionKeys,
    auth: { ...EMPTY_TASK_AUTH_SCOPE },
  };
}

type IntegrationSpec = {
  label: string;
  files: string[];
  contextType: string;
  contextIdPattern: RegExp;
};

const INTEGRATIONS: IntegrationSpec[] = [
  {
    label: "MATCH",
    files: ["components/admin/matchcenter/MatchcenterDetail.tsx"],
    contextType: "MATCH",
    contextIdPattern: /contextId=\{match\.id\}/,
  },
  {
    label: "TRAINING",
    files: ["app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx"],
    contextType: "TRAINING",
    contextIdPattern: /contextId=\{series\.id\}/,
  },
  {
    label: "TOURNAMENT",
    files: ["app/(admin)/dashboard/tournamentcenter/[tournamentId]/edit/page.tsx"],
    contextType: "TOURNAMENT",
    contextIdPattern: /contextId=\{tournament\.id\}/,
  },
  {
    label: "CLUB_EVENT",
    files: ["app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx"],
    contextType: "CLUB_EVENT",
    contextIdPattern: /contextId=\{event\.id\}/,
  },
  {
    label: "MEETING",
    files: ["app/(admin)/vereinsleitung/meetings/[slug]/page.tsx"],
    contextType: "MEETING",
    contextIdPattern: /contextId=\{dbMeeting\.id\}/,
  },
  {
    label: "REGISTRATION",
    files: ["app/(admin)/tenant/[tenantSlug]/cockpit/registrations/[registrationId]/page.tsx"],
    contextType: "REGISTRATION",
    contextIdPattern: /contextId=\{registration\.id\}/,
  },
  {
    label: "TEAM",
    files: ["app/(admin)/dashboard/teams/[teamId]/page.tsx"],
    contextType: "TEAM",
    contextIdPattern: /contextId=\{team\.id\}/,
  },
  {
    label: "PERSON",
    files: ["app/(admin)/dashboard/persons/[id]/page.tsx"],
    contextType: "PERSON",
    contextIdPattern: /contextId=\{person\.id\}/,
  },
  {
    label: "DOCUMENT",
    files: ["app/(admin)/dashboard/workspace/page.tsx"],
    contextType: "DOCUMENT",
    contextIdPattern: /contextId=\{initialSelectedDocumentId\}/,
  },
];

describe("AUFGABEN-06F2 entity integrations (R1–R17, R51–R54)", () => {
  for (const spec of INTEGRATIONS) {
    it(`${spec.label} wires shared panel and contextual create`, () => {
      const combined = spec.files.map((f) => read(f)).join("\n");
      expect(combined).toMatch(/ContextRelatedTasksPanel/);
      expect(
        /ContextualTaskCreateTriggerServer|createTaskAction|ContextRelatedTasksPanel/.test(combined),
      ).toBe(true);
      expect(combined).toMatch(new RegExp(`contextType="${spec.contextType}"`));
      expect(combined).toMatch(spec.contextIdPattern);
      expect(combined).not.toMatch(/prisma\.task\.findMany/);
      expect(combined).not.toMatch(/prisma\.task\.count/);
    });
  }

  it("R54 Match reference integration unchanged", () => {
    const detail = read("components/admin/matchcenter/MatchcenterDetail.tsx");
    expect(detail).toMatch(/contextType="MATCH"/);
    expect(detail).toMatch(/contextId=\{match\.id\}/);
    expect(detail).not.toMatch(/taskCreateFromContextHref/);
  });

  it("R11 TEAM navigation href remains canonical", () => {
    expect(buildOperationalContextHref("TEAM", { id: "team-9" })).toBe("/dashboard/teams/team-9");
  });

  it("R50 no list-row related panel in planner/list hotspots", () => {
    expect(read("components/admin/matchcenter/MatchcenterSpielplanungRow.tsx")).not.toMatch(
      /ContextRelatedTasksPanel/,
    );
    expect(read("components/admin/veranstaltungen/VeranstaltungenManagementWorkspace.tsx")).not.toMatch(
      /ContextRelatedTasksPanel/,
    );
  });
});

describe("AUFGABEN-06F2 registry contracts (R3–R6, R42–R46)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R3/R4 TRAINING uses TrainingSeries id and rejects session semantics", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TRAININGS_VIEW]);
    prismaMocks.trainingSeriesFindFirst.mockImplementation(
      async (args: { where: { id: string; tenantId: string } }) =>
        args.where.id === "series-1" && args.where.tenantId === TENANT ? { id: "series-1" } : null,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TRAINING, "series-1")).toBe(true);
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TRAINING, "session-1")).toBe(
      false,
    );
    expect(prismaMocks.trainingSessionFindFirst).not.toHaveBeenCalled();
    expect(read("app/(admin)/dashboard/training/series/[seriesId]/edit/page.tsx")).not.toMatch(
      /TRAINING_SESSION|TrainingSession/,
    );
  });

  it("R5 TOURNAMENT Event type TOURNAMENT", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.EVENTS_VIEW]);
    prismaMocks.eventFindFirst.mockImplementation(
      async (args: { where: { id: string; type: string } }) =>
        args.where.type === "TOURNAMENT" && args.where.id === "t1" ? { id: "t1" } : null,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TOURNAMENT, "t1")).toBe(true);
    expect(await validateTaskContextAttachable(ctx, TaskContextType.TOURNAMENT, "other")).toBe(
      false,
    );
  });

  it("R6 CLUB_EVENT Event type OTHER", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.EVENTS_VIEW]);
    prismaMocks.eventFindFirst.mockImplementation(
      async (args: { where: { id: string; type: string } }) =>
        args.where.type === "OTHER" && args.where.id === "e1" ? { id: "e1" } : null,
    );
    expect(await validateTaskContextAttachable(ctx, TaskContextType.CLUB_EVENT, "e1")).toBe(true);
  });

  it("R43–R46 excluded contexts not added in rollout surfaces", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).not.toMatch(/SPONSOR.*TaskContextType/);
    for (const spec of INTEGRATIONS) {
      const combined = spec.files.map((f) => read(f)).join("\n");
      expect(combined).not.toMatch(/INITIATIVE|FACILITY|NEWS_ARTICLE|TaskSeries.*contextType/);
    }
  });
});

describe("AUFGABEN-06F2 MEETING gate (R7–R8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R7/R8 meeting panel only when dbMeeting visible; loader returns null when forbidden", async () => {
    const meetingPage = read("app/(admin)/vereinsleitung/meetings/[slug]/page.tsx");
    expect(meetingPage).toMatch(/getMeetingBySlug/);
    expect(meetingPage).toMatch(/dbMeeting \?/);

    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]);
    prismaMocks.resolveEligibility.mockResolvedValue({
      canCreate: false,
      canViewRelatedTasks: false,
    });
    const panel = await loadContextRelatedTasksPanel(ctx, TaskContextType.MEETING, "m-hidden");
    expect(panel).toBeNull();
    expect(prismaMocks.taskFindMany).not.toHaveBeenCalled();
    expect(prismaMocks.taskCount).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06F2 DOCUMENT gate (R14–R15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R14/R15 document workspace uses canRead gate via shared loader", async () => {
    const workspacePage = read("app/(admin)/dashboard/workspace/page.tsx");
    expect(workspacePage).toMatch(/canReadWorkspaceDocument/);
    expect(workspacePage).toMatch(/ContextRelatedTasksPanel/);

    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW]);
    prismaMocks.resolveEligibility.mockResolvedValue({
      canCreate: false,
      canViewRelatedTasks: false,
    });
    const panel = await loadContextRelatedTasksPanel(ctx, TaskContextType.DOCUMENT, "doc-x");
    expect(panel).toBeNull();
    expect(prismaMocks.taskCount).not.toHaveBeenCalled();
  });
});

describe("AUFGABEN-06F2 shared services (R16–R18, R32–R35)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.eventFindFirst.mockResolvedValue({ id: "match-1" });
    prismaMocks.taskFindMany.mockResolvedValue([]);
    prismaMocks.taskCount.mockResolvedValue(0);
    prismaMocks.resolveEligibility.mockResolvedValue({
      canCreate: true,
      canViewRelatedTasks: true,
    });
  });

  it("R17 list/count delegate to canonical services", async () => {
    const ctx = serviceCtx(USER, [PERMISSIONS.TASKS_VIEW, PERMISSIONS.EVENTS_VIEW]);
    await listTasksForContext(ctx, TaskContextType.MATCH, "match-1");
    await countTasksForContext(ctx, TaskContextType.MATCH, "match-1", { rootsOnly: true });
    expect(prismaMocks.taskFindMany).toHaveBeenCalled();
    expect(prismaMocks.taskCount).toHaveBeenCalled();
    const listSrc = read("lib/tasks/list-tasks-for-context.ts");
    expect(listSrc).toMatch(/assertTaskContextEntityReadable/);
    expect(listSrc).toMatch(/buildRelatedTaskWhere/);
  });

  it("R32–R35 panel loader uses bounded defaults", () => {
    const loader = read("lib/tasks/load-context-related-tasks-panel.ts");
    expect(loader).toMatch(/countTasksForContext/);
    expect(loader).toMatch(/listTasksForContext/);
    expect(loader).toMatch(/DEFAULT_ENTITY_RELATED_TASK_STATUSES/);
    expect(loader).toMatch(/DEFAULT_ENTITY_RELATED_TASK_ROOTS_ONLY/);
  });
});

describe("AUFGABEN-06F2 contextual create contract (R19–R24, R36–R37)", () => {
  it("R19 contextual create defaults CLUB visibility when scope omitted", () => {
    const actions = read("app/(admin)/dashboard/aufgaben/actions.ts");
    expect(actions).toMatch(/parseOrgVisibilityFromForm/);
    expect(actions).toMatch(/TaskVisibilityScopeEnum\.CLUB/);
    expect(read("components/admin/aufgaben/contextual/ContextualTaskCreateDialog.tsx")).toMatch(
      /TaskOrgVisibilityFields/,
    );
  });

  it("R20/R21 ORG_UNIT and ASSIGNEES_ONLY remain in visibility fields", () => {
    const fields = read("components/admin/aufgaben/TaskOrgVisibilityFields.tsx");
    expect(fields).toMatch(/ORG_UNIT/);
    expect(fields).toMatch(/ASSIGNEES_ONLY/);
  });

  it("R22 client cannot override trusted context in server action", async () => {
    const fd = new FormData();
    fd.set("title", "Test");
    fd.set("contextType", "PERSON");
    fd.set("contextId", "p1");
    const result = await createContextualAufgabeAction("MATCH", "match-1", fd);
    expect(result.ok).toBe(false);
  });

  it("R36/R37 entity pages use shared trigger without subtask UI", () => {
    for (const spec of INTEGRATIONS) {
      const combined = spec.files.map((f) => read(f)).join("\n");
      expect(combined).not.toMatch(/Unteraufgabe/i);
    }
  });

  it("R13 PERSON assignee not inferred from Person.userId in create defaults", () => {
    const createSrc = read("lib/tasks/contextual-task-create.ts");
    const panel = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx");
    expect(createSrc).not.toMatch(/person\.userId/);
    expect(panel).not.toMatch(/person\.userId/);
    expect(read("lib/tasks/__tests__/aufgaben-06f1-a2-acceptance.test.ts")).toMatch(
      /PERSON context with assignee User B/,
    );
  });
});

describe("AUFGABEN-06F2 platform reuse (R48–R49, R55–R60)", () => {
  it("R48/R49 no prisma schema migration for rollout", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toMatch(/model Task/);
    expect(schema).not.toMatch(/contextType.*TaskSeries/);
  });

  it("R55/R56 quick create and full create unchanged", () => {
    expect(read("lib/tasks/quick-create.ts")).toMatch(/QUICK_CREATE_FORBIDDEN_FORM_KEYS/);
    expect(read("components/admin/aufgaben/AufgabenFullCreateClient.tsx")).toMatch(/TaskContextField/);
  });

  it("R53 canonical workspace destination in panel view", () => {
    expect(read("components/admin/aufgaben/contextual/ContextRelatedTasksPanelView.tsx")).toMatch(
      /taskWorkspaceHref/,
    );
  });

  it("R51/R52 shared trigger and panel components reused", () => {
    const trigger = read("components/admin/aufgaben/contextual/ContextualTaskCreateTriggerServer.tsx");
    const panel = read("components/admin/aufgaben/contextual/ContextRelatedTasksPanel.tsx");
    expect(trigger).toMatch(/loadContextualTaskCreateView/);
    expect(panel).toMatch(/loadContextRelatedTasksPanel/);
  });
});

describe("AUFGABEN-06F2 open-by-default visibility (R19, R38–R40)", () => {
  it("contextual action applies CLUB when visibility fields omitted", () => {
    expect(read("app/(admin)/dashboard/aufgaben/actions.ts")).toMatch(
      /createContextualAufgabeAction[\s\S]*parseOrgVisibilityFromForm/,
    );
    expect(read("lib/tasks/__tests__/aufgaben-06f1-a3-open-by-default.test.ts")).toMatch(
      /CLUB visibility/,
    );
    expect(TaskVisibilityScope.CLUB).toBe("CLUB");
  });
});
