import { describe, expect, it } from "vitest";
import {
  buildVerwaltungUnifiedRows,
  resolveVerwaltungUnifiedOverviewTaskQuery,
} from "../verwaltung-unified-presentation";

describe("Verwaltung unified presentation (R4.3)", () => {
  it("E — composes Aufgabe and Anforderung rows with stable sort keys", () => {
    const rows = buildVerwaltungUnifiedRows({
      tasks: [
        {
          task: {
            id: "t1",
            tenantId: "tenant",
            title: "Spielbericht",
            description: null,
            status: "OPEN",
            priority: "NORMAL",
            dueAt: "2026-10-25T12:00:00.000Z",
            reminder1At: null,
            reminder2At: null,
            reminder1PresetKey: null,
            reminder2PresetKey: null,
            completedAt: null,
            contextType: null,
            contextId: null,
            parentTaskId: null,
            taskSeriesId: null,
            orgUnitId: null,
            visibilityScope: "CLUB",
            createdByUserId: "u1",
            createdAt: "2026-09-01T10:00:00.000Z",
            updatedAt: "2026-09-01T10:00:00.000Z",
            assignees: [],
          },
          parentTask: null,
          subtasks: [],
          progress: { completedCount: 0, totalCount: 0, percent: 0, label: "0 / 0" },
          seriesRecurrenceLabel: null,
          context: null,
          expandable: false,
          organisationLabel: "",
          visibilityLabel: "",
        },
      ],
      requirements: [
        {
          requirement: {
            id: "r1",
            tenantId: "tenant",
            title: "Handbuch",
            description: null,
            status: "DRAFT",
            responseMode: "ACKNOWLEDGE",
            dueAt: "2026-10-20T12:00:00.000Z",
            reminder1At: null,
            reminder2At: null,
            reminder1PresetKey: null,
            reminder2PresetKey: null,
            remindersConfigured: false,
            activatedAt: null,
            closedAt: null,
            cancelledAt: null,
            createdByUserId: "u1",
            createdAt: "2026-09-01T10:00:00.000Z",
            updatedAt: "2026-09-01T10:00:00.000Z",
            draftAudiencePersonIds: undefined as unknown as string[],
            draftAudienceTeamIds: [],
            draftAudienceOrgUnitIds: [],
            draftAudienceRoleIds: [],
            draftAudienceTargetGroupIds: [],
            draftAudienceComposition: null,
          },
          aggregate: null,
          creatorLabel: null,
          isOverdue: false,
        },
      ],
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      taskHref: (id) => `/tasks/${id}`,
      requirementHref: (id) => `/req/${id}`,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.kind).toBe("ANFORDERUNG");
    expect(rows[1]?.kind).toBe("AUFGABE");
  });

  it("F — ignores WIEDERKEHREND view for Verwaltung Alle overview query", () => {
    const query = resolveVerwaltungUnifiedOverviewTaskQuery(
      { view: "WIEDERKEHREND", bereich: "verwaltung" },
      true,
    );
    expect(query.view).toBe("ALLE");
    expect(query.page).toBe(1);
  });
});
