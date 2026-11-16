import { getTranslations } from "next-intl/server";
import { PersonalProgrammeFeed } from "@/components/ui/dashboard/PersonalProgrammeFeed";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { buildMeinProgrammKalenderOpenHref } from "@/lib/personal-agenda/mein-programm-url";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import { loadPersonalDashboardProgrammeSectionOutcome } from "@/lib/dashboard/personal-dashboard-section-status";
import { PersonalDashboardSectionRetry } from "../PersonalDashboardSectionRetry";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardProgrammeSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tProgramme = await getTranslations("PersonalDashboard.programme");
  const tCalendar = await getTranslations("PersonalDashboard.calendar");
  const tSection = await getTranslations("PersonalDashboard.sectionStatus");

  const outcome = await loadPersonalDashboardProgrammeSectionOutcome(
    toPersonalDashboardSectionContext(props),
  );

  if (outcome.kind === "unavailable") {
    return (
      <SceWorkspaceSectionShell
        title={tProgramme("todayNextTitle")}
        testId="personal-dashboard-programme-section"
      >
        <p className="text-sm text-[var(--muted)]" data-testid="personal-programme-unavailable">
          {tSection("programmeUnavailable")}
        </p>
      </SceWorkspaceSectionShell>
    );
  }

  if (outcome.kind === "failed") {
    return (
      <SceWorkspaceSectionShell
        title={tProgramme("todayNextTitle")}
        testId="personal-dashboard-programme-section"
        bodyClassName="p-5"
      >
        <PersonalDashboardSectionRetry
          title={tSection("loadFailedTitle")}
          description={outcome.message}
          testId="personal-dashboard-programme-error"
        />
      </SceWorkspaceSectionShell>
    );
  }

  const programme = outcome.data;
  const timeLabelById: Record<string, string> = {};
  for (const item of programme.programmeItems) {
    timeLabelById[item.id] = item.allDay ? "" : formatTime(item.startsAt, props.fmtCfg);
  }

  const calendarOpenHref = buildMeinProgrammKalenderOpenHref(programme.monthParam);
  const programmeLinkLabel = tCalendar("openCalendar");

  return (
    <SceWorkspaceSectionShell
      title={tProgramme("todayNextTitle")}
      href={calendarOpenHref}
      linkLabel={programmeLinkLabel}
      linkTestId="personal-programme-open-calendar"
      testId="personal-dashboard-programme-section"
    >
      <div data-sce-section-readiness={outcome.isEmpty ? "empty" : "ready"}>
      <PersonalProgrammeFeed
        groups={programme.groups}
        supported
        timeLabelById={timeLabelById}
        embedded
      />
      </div>
    </SceWorkspaceSectionShell>
  );
}