import { Suspense } from "react";
import { finishSceHotfixLogin01DashboardTrace } from "@/lib/incident/sce-hotfix-login-01-trace";
import { SceHotfixLogin01DashboardClientMarks } from "@/components/admin/dashboard/SceHotfixLogin01DashboardClientMarks";
import { PersonalDashboardCommandCenterLoadingSurface } from "./PersonalDashboardCommandCenterLoadingSurface";
import ClubDashboardAttentionSectionAsync from "./sections/ClubDashboardAttentionSectionAsync";
import ClubDashboardProgrammeSectionAsync from "./sections/ClubDashboardProgrammeSectionAsync";
import ClubDashboardTasksSectionAsync from "./sections/ClubDashboardTasksSectionAsync";
import ClubDashboardQuickAccessSectionAsync from "./sections/ClubDashboardQuickAccessSectionAsync";
import type { ClubDashboardSectionsBaseProps } from "./sections/ClubDashboardSectionContext";

export type ClubDashboardCommandCenterProps = ClubDashboardSectionsBaseProps;

export default function ClubDashboardCommandCenter(props: ClubDashboardCommandCenterProps) {
  finishSceHotfixLogin01DashboardTrace();

  return (
    <div className="flex min-w-0 flex-col gap-6" data-testid="club-dashboard-command-center">
      <SceHotfixLogin01DashboardClientMarks />
      <div
        className="min-w-0 space-y-6"
        data-testid="personal-dashboard-workspace"
        data-sce-dashboard-layout="cd-reference"
      >
        <Suspense
          fallback={<PersonalDashboardCommandCenterLoadingSurface mode="attention" />}
        >
          <ClubDashboardAttentionSectionAsync {...props} />
        </Suspense>

        <div
          className="grid items-start gap-6 xl:grid-cols-2"
          data-testid="personal-dashboard-programme-tasks-grid"
          data-sce-dashboard-programme-tasks-pairing
        >
          <Suspense fallback={<PersonalDashboardCommandCenterLoadingSurface mode="programme" />}>
            <ClubDashboardProgrammeSectionAsync {...props} />
          </Suspense>
          <Suspense fallback={<PersonalDashboardCommandCenterLoadingSurface mode="tasks" />}>
            <ClubDashboardTasksSectionAsync {...props} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<PersonalDashboardCommandCenterLoadingSurface mode="quick-access" />}>
        <ClubDashboardQuickAccessSectionAsync {...props} />
      </Suspense>
    </div>
  );
}