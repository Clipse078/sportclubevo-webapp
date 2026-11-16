import { getTranslations } from "next-intl/server";
import { PersonalTasksPreview } from "@/components/ui/dashboard";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { loadPersonalDashboardWorkSection } from "@/lib/dashboard/personal-dashboard-section-loaders";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardTasksSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tTasks = await getTranslations("PersonalDashboard.tasks");
  const work = await loadPersonalDashboardWorkSection(
    toPersonalDashboardSectionContext(props),
  );

  if (!work.tasks.authorized) {
    return null;
  }

  return (
    <SceWorkspaceSectionShell
      title={tTasks("title")}
      href="/dashboard/aufgaben?bereich=meine"
      linkLabel={tTasks("viewAll")}
      testId="personal-dashboard-tasks-section"
    >
      <PersonalTasksPreview previewItems={work.tasks.preview} embedded />
    </SceWorkspaceSectionShell>
  );
}