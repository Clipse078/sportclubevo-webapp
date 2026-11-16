/**
 * Loads personal-dashboard sections and maps results to explicit outcomes.
 *
 * Read-model path: programme, work, and secondary sections share one cached
 * `getPersonalCommandCenterData` call per request — not independent network fetches.
 * Legacy path: programme and work sections load independently (parallel Suspense).
 */
import type { ProgrammeFeedGroup } from "@/lib/personal-agenda/programme-feed-groups";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type {
  DashboardPersonalTaskPreviewItem,
  PersonalAttentionSnapshot,
} from "@/lib/dashboard/personal-attention";
import type { CommandCenterNewsItem } from "@/lib/dashboard/command-center-presentation";
import type { PersonalDashboardSecondaryActivity } from "@/lib/dashboard/secondary-activity-facts";
import {
  type PersonalDashboardSectionContext,
  loadPersonalDashboardProgrammeSection,
  loadPersonalDashboardSecondarySection,
  loadPersonalDashboardWorkSection,
  personalDashboardUsesSharedReadModelCore,
} from "./personal-dashboard-section-loaders";
import {
  personalDashboardSectionFailed,
  type PersonalDashboardSectionOutcome,
  type PersonalDashboardSectionUnavailable,
} from "./personal-dashboard-section-outcome";

export type ProgrammeSectionPayload = {
  groups: ProgrammeFeedGroup[];
  programmeSupported: boolean;
  programmeItems: PersonalProgrammeItem[];
  monthParam: string;
  navigation: {
    previousMonthHref: string;
    nextMonthHref: string;
    todayHref: string;
  };
};

export type WorkSectionPayload = {
  attention: PersonalAttentionSnapshot;
  tasks: {
    authorized: boolean;
    preview: DashboardPersonalTaskPreviewItem[];
  };
};

export type SecondarySectionPayload = {
  newsItems: CommandCenterNewsItem[];
  activitySources: PersonalDashboardSecondaryActivity[];
};

function programmeIsEmpty(groups: ProgrammeFeedGroup[]): boolean {
  return groups.length === 0 || groups.every((group) => group.items.length === 0);
}

export async function loadPersonalDashboardProgrammeSectionOutcome(
  ctx: PersonalDashboardSectionContext,
): Promise<PersonalDashboardSectionOutcome<ProgrammeSectionPayload>> {
  try {
    const data = await loadPersonalDashboardProgrammeSection(ctx);
    if (!data.programmeSupported) {
      return { kind: "unavailable", section: "programme", reason: "not_supported" };
    }
    return {
      kind: "success",
      section: "programme",
      data,
      isEmpty: programmeIsEmpty(data.groups),
    };
  } catch (error) {
    return personalDashboardSectionFailed(
      "programme",
      error,
      "Heute & als Nächstes konnte nicht geladen werden.",
    );
  }
}

export async function loadPersonalDashboardWorkSectionOutcome(
  ctx: PersonalDashboardSectionContext,
): Promise<PersonalDashboardSectionOutcome<WorkSectionPayload>> {
  try {
    const data = await loadPersonalDashboardWorkSection(ctx);
    const attentionDegraded = Boolean(data.attention.operationalSourcesDegraded);
    return {
      kind: "success",
      section: "tasks",
      data,
      isEmpty:
        data.attention.authorized &&
        data.attention.items.length === 0 &&
        (!data.tasks.authorized || data.tasks.preview.length === 0),
      degraded: attentionDegraded,
    };
  } catch (error) {
    return personalDashboardSectionFailed(
      "tasks",
      error,
      "Aufgaben und Aufmerksamkeit konnten nicht geladen werden.",
    );
  }
}

export async function loadPersonalDashboardAttentionSectionOutcome(
  ctx: PersonalDashboardSectionContext,
): Promise<
  | PersonalDashboardSectionOutcome<WorkSectionPayload>
  | PersonalDashboardSectionUnavailable
> {
  const work = await loadPersonalDashboardWorkSectionOutcome(ctx);
  if (work.kind === "failed") {
    return { ...work, section: "attention" };
  }
  if (work.kind === "unavailable") {
    return work;
  }
  if (!work.data.attention.authorized) {
    return { kind: "unavailable", section: "attention", reason: "not_authorized" };
  }
  return {
    ...work,
    section: "attention",
    isEmpty: work.data.attention.items.length === 0,
    degraded: Boolean(work.data.attention.operationalSourcesDegraded),
  };
}

export async function loadPersonalDashboardTasksSectionOutcome(
  ctx: PersonalDashboardSectionContext,
): Promise<PersonalDashboardSectionOutcome<WorkSectionPayload>> {
  const work = await loadPersonalDashboardWorkSectionOutcome(ctx);
  if (work.kind !== "success") {
    return work.section === "tasks"
      ? work
      : { ...work, section: "tasks" as const };
  }
  if (!work.data.tasks.authorized) {
    return { kind: "unavailable", section: "tasks", reason: "not_authorized" };
  }
  return {
    ...work,
    section: "tasks",
    isEmpty: work.data.tasks.preview.length === 0,
  };
}

export async function loadPersonalDashboardSecondarySectionOutcome(
  ctx: PersonalDashboardSectionContext,
): Promise<PersonalDashboardSectionOutcome<SecondarySectionPayload>> {
  try {
    const data = await loadPersonalDashboardSecondarySection(ctx);
    const isEmpty = data.newsItems.length === 0 && data.activitySources.length === 0;
    return {
      kind: "success",
      section: "secondary",
      data,
      isEmpty,
    };
  } catch (error) {
    return personalDashboardSectionFailed(
      "secondary",
      error,
      "Zusatzinhalte konnten nicht geladen werden.",
    );
  }
}

/** @internal test export */
export function personalDashboardSectionLoadingSemantics() {
  return {
    sharedReadModelCore: personalDashboardUsesSharedReadModelCore(),
  };
}