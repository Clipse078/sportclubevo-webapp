import { getTranslations } from "next-intl/server";
import { PersonalProgrammeFeed } from "@/components/ui/dashboard/PersonalProgrammeFeed";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { buildMeinProgrammKalenderOpenHref } from "@/lib/personal-agenda/mein-programm-url";
import { formatTime } from "@/lib/tenant-runtime/formatters";
import { loadPersonalDashboardProgrammeSection } from "@/lib/dashboard/personal-dashboard-section-loaders";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardProgrammeSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tProgramme = await getTranslations("PersonalDashboard.programme");
  const tCalendar = await getTranslations("PersonalDashboard.calendar");
  const programme = await loadPersonalDashboardProgrammeSection(
    toPersonalDashboardSectionContext(props),
  );

  const timeLabelById: Record<string, string> = {};
  for (const item of programme.programmeItems) {
    timeLabelById[item.id] = item.allDay ? "" : formatTime(item.startsAt, props.fmtCfg);
  }

  const calendarOpenHref = buildMeinProgrammKalenderOpenHref(programme.monthParam);
  const programmeLinkLabel = programme.programmeSupported ? tCalendar("openCalendar") : undefined;

  return (
    <SceWorkspaceSectionShell
      title={tProgramme("todayNextTitle")}
      href={programme.programmeSupported ? calendarOpenHref : undefined}
      linkLabel={programmeLinkLabel}
      linkTestId="personal-programme-open-calendar"
      testId="personal-dashboard-programme-section"
    >
      <PersonalProgrammeFeed
        groups={programme.groups}
        supported={programme.programmeSupported}
        timeLabelById={timeLabelById}
        embedded
      />
    </SceWorkspaceSectionShell>
  );
}