import { getTranslations } from "next-intl/server";
import { PublicFinancePublicationShareExperience } from "@/components/public/finance/PublicFinancePublicationShareExperience";
import { buildFinanceManagementPnlPanelLabels } from "@/lib/finance/presentation/build-finance-management-pnl-panel-labels";
import { loadPublicFinancePublicationShareViewModel } from "@/lib/finance/server/load-public-finance-publication-share";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Financial report",
    robots: { index: false, follow: false },
  };
}

export default async function FinancePublicationSharePage({ params }: PageProps) {
  const { token } = await params;
  const model = await loadPublicFinancePublicationShareViewModel(token);
  const t = await getTranslations("Finance");
  const share = await getTranslations("Finance.reporting.publicationShare");
  const pub = await getTranslations("Finance.reporting.publication");
  const pnlLabels = buildFinanceManagementPnlPanelLabels((key) => t(key));

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicFinancePublicationShareExperience
        model={model.ok ? model : null}
        labels={{
          unavailable: share("externalUnavailable"),
          officialPublication: pub("dialogContentValue"),
          versionLabel: pub("versionLabel"),
          publishedAtLabel: pub("publishedAtLabel"),
          statusPublished: pub("statusPublished"),
          frozenNotice: pub("frozenNotice"),
          downloadPdf: pub("downloadPdf"),
        }}
        pnlLabels={pnlLabels}
      />
    </div>
  );
}
