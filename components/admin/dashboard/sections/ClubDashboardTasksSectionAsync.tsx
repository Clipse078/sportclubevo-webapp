import { getTranslations } from "next-intl/server";
import { PersonalTasksPreview } from "@/components/ui/dashboard";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { loadPersonalDashboardTasksSectionOutcome } from "@/lib/dashboard/personal-dashboard-section-status";
import { PersonalDashboardSectionRetry } from "../PersonalDashboardSectionRetry";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardTasksSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tTasks = await getTranslations("PersonalDashboard.tasks");
  const tSection = await getTranslations("PersonalDashboard.sectionStatus");

  const outcome = await loadPersonalDashboardTasksSectionOutcome(
    toPersonalDashboardSectionContext(props),
  );

  if (outcome.kind === "unavailable") {
    return null;
  }

  if (outcome.kind === "failed") {
    return (
      <SceWorkspaceSectionShell
        title={tTasks("title")}
        testId="personal-dashboard-tasks-section"
        bodyClassName="p-5"
      >
        <PersonalDashboardSectionRetry
          title={tSection("loadFailedTitle")}
          description={outcome.message}
          testId="personal-dashboard-tasks-error"
        />
      </SceWorkspaceSectionShell>
    );
  }

  return (
    <SceWorkspaceSectionShell
      title={tTasks("title")}
      href="/dashboard/aufgaben?bereich=meine"
      linkLabel={tTasks("viewAll")}
      testId="personal-dashboard-tasks-section"
    >
      <div data-sce-section-readiness={outcome.isEmpty ? "empty" : "ready"}>
      <PersonalTasksPreview previewItems={outcome.data.tasks.preview} embedded />
      </div>
    </SceWorkspaceSectionShell>
  );
}