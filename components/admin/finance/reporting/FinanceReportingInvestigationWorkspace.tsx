"use client";

import { useCallback, useState, type ComponentProps } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { loadFinanceReportingDetailAction } from "@/app/(admin)/dashboard/finance/reports/actions";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import {
  FinanceManagementReportingDetailSheet,
  type FinanceManagementReportingDetailLabels,
} from "@/components/admin/finance/reporting/FinanceManagementReportingDetailSheet";
import type { SerializedFinanceManagementPnlReadModel } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import type { SerializedFinanceManagementReportingDetailReadModel } from "@/lib/finance/presentation/serialize-management-reporting-detail-read-model";
import {
  FinanceReportingPublicationBar,
  type FinancePublicationHistoryLabels,
} from "@/components/admin/finance/reporting/FinanceReportingPublicationBar";
import type { FinanceManagementPnlPublicationLabels } from "@/components/admin/finance/reporting/FinanceManagementPnlPublicationDialog";
import type { FinancePublicationInspectionLabels } from "@/components/admin/finance/reporting/FinancePublicationInspectionSheet";
import type { FinancePublicationFastShareLabels } from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";
import type { FinancePublicationShareManagementLabels } from "@/components/admin/finance/reporting/FinancePublicationShareManagement";
import type { FinancePublicationDistributionLabels } from "@/components/admin/finance/reporting/FinancePublicationDistributionDialog";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";

type PnlLabels = ComponentProps<typeof FinanceManagementPnlPanel>["labels"];

type Props = {
  model: SerializedFinanceManagementPnlReadModel;
  formattingLocale: string;
  canConfigureStructure: boolean;
  pnlLabels: PnlLabels;
  detailLabels: FinanceManagementReportingDetailLabels;
  initialAccountId?: string | null;
  initialGroupId?: string | null;
  initialDetail?: SerializedFinanceManagementReportingDetailReadModel | null;
  initialDetailOpen?: boolean;
  canPublishReport?: boolean;
  canSharePublication?: boolean;
  canRevokePublicationShares?: boolean;
  publicationSummary?: SerializedFinancePublicationSummaryReadModel | null;
  publicationLabels?: FinanceManagementPnlPublicationLabels;
  publicationInspectionLabels?: FinancePublicationInspectionLabels;
  publicationHistoryLabels?: FinancePublicationHistoryLabels;
  publicationFastShareLabels?: FinancePublicationFastShareLabels;
  publicationShareManagementLabels?: FinancePublicationShareManagementLabels;
  canDistributePublication?: boolean;
  publicationDistributionLabels?: FinancePublicationDistributionLabels;
};

export function FinanceReportingInvestigationWorkspace({
  model,
  formattingLocale,
  canConfigureStructure,
  pnlLabels,
  detailLabels,
  initialAccountId,
  initialGroupId,
  initialDetail = null,
  initialDetailOpen = false,
  canPublishReport = false,
  canSharePublication = false,
  canRevokePublicationShares = false,
  publicationSummary = null,
  publicationLabels,
  publicationInspectionLabels,
  publicationHistoryLabels,
  publicationFastShareLabels,
  publicationShareManagementLabels,
  canDistributePublication = false,
  publicationDistributionLabels,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [detailOpen, setDetailOpen] = useState(initialDetailOpen);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<SerializedFinanceManagementReportingDetailReadModel | null>(
    initialDetail,
  );
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(initialAccountId ?? null);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(initialGroupId ?? null);

  const syncUrl = useCallback(
    (next: { accountId: string | null; groupId: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("account");
      params.delete("group");
      if (next.accountId) params.set("account", next.accountId);
      if (next.groupId) params.set("group", next.groupId);
      if (model.financeYearId) params.set("yearId", model.financeYearId);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [model.financeYearId, pathname, router, searchParams],
  );

  const openInvestigation = useCallback(
    async (input: { accountId: string | null; groupId: string | null }) => {
      setFocusedAccountId(input.accountId);
      setFocusedGroupId(input.groupId);
      syncUrl(input);
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);

      const result = await loadFinanceReportingDetailAction({
        financeYearId: model.financeYearId,
        accountId: input.accountId,
        groupId: input.groupId,
        actualGrain: model.actualGrain ?? undefined,
      });

      setDetailLoading(false);
      if (result.ok) {
        setDetail(result.detail);
      } else {
        setDetail({
          tenantId: model.tenantId,
          financeYearId: model.financeYearId,
          financeYearName: model.financeYearName,
          baseCurrency: model.baseCurrency,
          availability: "NOT_FOUND",
          targetKind: input.accountId ? "ACCOUNT" : "REPORTING_GROUP",
          accountId: input.accountId,
          groupId: input.groupId,
          name: "",
          lifecycle: "ACTIVE",
          archivedAt: null,
          canonicalSemantic: "INCOME",
          hierarchyPath: [],
          isUnassignedResidual: false,
          actualGrain: model.actualGrain,
          actualCutoffDate: model.actualCutoffDate,
          approvedBudget: { availability: "NOT_VISIBLE", amountMinor: null },
          actual: { availability: "NOT_VISIBLE", amountMinor: null },
          currentForecast: { availability: "NOT_VISIBLE", amountMinor: null },
          forecastVsBudget: {
            availability: "BOTH_MISSING",
            baselineMinor: null,
            comparisonMinor: null,
            rawDeltaMinor: null,
            variancePercent: null,
            favorability: null,
            absoluteVarianceMagnitudeMinor: null,
          },
          comparativePeriodContext: {
            actualVsBudgetVarianceRole: model.comparativeIntelligence.actualVsBudgetVarianceRole,
            grainExplanationKey: model.comparativeIntelligence.actualContext.grainExplanationKey,
          },
          actualEvidence: { availability: "NOT_VISIBLE", entries: [] },
          sourceActions: {
            budget: { canNavigate: false, href: null },
            actual: { canNavigate: false, href: null },
            forecast: { canNavigate: false, href: null },
            timing: { canNavigate: false, href: null },
          },
          childAccountSummaries: [],
        });
      }
    },
    [model, syncUrl],
  );

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setFocusedAccountId(null);
    setFocusedGroupId(null);
    syncUrl({ accountId: null, groupId: null });
  }, [syncUrl]);

  return (
    <ToastProvider>
      {publicationLabels && publicationInspectionLabels ? (
        <FinanceReportingPublicationBar
          financeYearId={model.financeYearId}
          financeYearName={model.financeYearName}
          formattingLocale={formattingLocale}
          canPublish={canPublishReport}
          canShare={canSharePublication}
          canRevokeShares={canRevokePublicationShares}
          reportPublishable={model.availability === "AVAILABLE"}
          publicationSummary={publicationSummary}
          publicationLabels={publicationLabels}
          inspectionLabels={publicationInspectionLabels}
          historyLabels={publicationHistoryLabels}
          pnlLabels={pnlLabels}
          fastShareLabels={publicationFastShareLabels}
          shareManagementLabels={publicationShareManagementLabels}
          canDistribute={canDistributePublication}
          distributionLabels={publicationDistributionLabels}
        />
      ) : null}
      <FinanceManagementPnlPanel
        model={model}
        formattingLocale={formattingLocale}
        canConfigureStructure={canConfigureStructure}
        labels={pnlLabels}
        focusedAccountId={focusedAccountId}
        focusedGroupId={focusedGroupId}
        onInvestigateAccount={(accountId) => void openInvestigation({ accountId, groupId: null })}
        onInvestigateGroup={(groupId) => void openInvestigation({ accountId: null, groupId })}
        onInvestigateDriver={(driver) =>
          void openInvestigation({
            accountId: driver.kind === "ACCOUNT" ? driver.id : null,
            groupId: driver.kind === "REPORTING_GROUP" ? driver.id : null,
          })
        }
      />
      <FinanceManagementReportingDetailSheet
        open={detailOpen}
        onClose={closeDetail}
        detail={detail}
        loading={detailLoading}
        formattingLocale={formattingLocale}
        labels={detailLabels}
        onInvestigateAccount={(accountId) => void openInvestigation({ accountId, groupId: null })}
      />
    </ToastProvider>
  );
}
