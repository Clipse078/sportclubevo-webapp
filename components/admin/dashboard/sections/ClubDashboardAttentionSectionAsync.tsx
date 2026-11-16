import { getTranslations } from "next-intl/server";
import { PersonalAttention } from "@/components/ui/dashboard";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { loadPersonalDashboardAttentionSectionOutcome } from "@/lib/dashboard/personal-dashboard-section-status";
import { PersonalDashboardSectionRetry } from "../PersonalDashboardSectionRetry";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardAttentionSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tAttention = await getTranslations("PersonalDashboard.attention");
  const tSection = await getTranslations("PersonalDashboard.sectionStatus");

  const outcome = await loadPersonalDashboardAttentionSectionOutcome(
    toPersonalDashboardSectionContext(props),
  );

  if (outcome.kind === "unavailable") {
    return null;
  }

  if (outcome.kind === "failed") {
    return (
      <SceWorkspaceSectionShell
        title={tAttention("sectionTitle")}
        testId="personal-dashboard-attention-section"
        bodyClassName="p-5"
      >
        <PersonalDashboardSectionRetry
          title={tSection("loadFailedTitle")}
          description={outcome.message}
          testId="personal-dashboard-attention-error"
        />
      </SceWorkspaceSectionShell>
    );
  }

  const { attention } = outcome.data;

  return (
    <SceWorkspaceSectionShell
      title={tAttention("sectionTitle")}
      href={attention.viewAllHref ?? undefined}
      linkLabel={attention.viewAllHref ? tAttention("openInbox") : undefined}
      testId="personal-dashboard-attention-section"
    >
      <div
        data-sce-section-readiness={
          outcome.degraded ? "degraded" : outcome.isEmpty ? "empty" : "ready"
        }
      >
      <PersonalAttention
        items={attention.items}
        totalCount={attention.totalCount}
        viewAllHref={attention.viewAllHref}
        operationalSourcesDegraded={attention.operationalSourcesDegraded}
        embeddedInSectionShell
      />
      </div>
    </SceWorkspaceSectionShell>
  );
}