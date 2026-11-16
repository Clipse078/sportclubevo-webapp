import { getTranslations } from "next-intl/server";
import { PersonalAttention } from "@/components/ui/dashboard";
import SceWorkspaceSectionShell from "@/components/sce/workspace/SceWorkspaceSectionShell";
import { loadPersonalDashboardWorkSection } from "@/lib/dashboard/personal-dashboard-section-loaders";
import {
  toPersonalDashboardSectionContext,
  type ClubDashboardSectionsBaseProps,
} from "./ClubDashboardSectionContext";

export default async function ClubDashboardAttentionSectionAsync(
  props: ClubDashboardSectionsBaseProps,
) {
  const tAttention = await getTranslations("PersonalDashboard.attention");
  const work = await loadPersonalDashboardWorkSection(
    toPersonalDashboardSectionContext(props),
  );

  if (!work.attention.authorized) {
    return null;
  }

  return (
    <SceWorkspaceSectionShell
      title={tAttention("sectionTitle")}
      href={work.attention.viewAllHref ?? undefined}
      linkLabel={work.attention.viewAllHref ? tAttention("openInbox") : undefined}
      testId="personal-dashboard-attention-section"
    >
      <PersonalAttention
        items={work.attention.items}
        totalCount={work.attention.totalCount}
        viewAllHref={work.attention.viewAllHref}
        operationalSourcesDegraded={work.attention.operationalSourcesDegraded}
        embeddedInSectionShell
      />
    </SceWorkspaceSectionShell>
  );
}