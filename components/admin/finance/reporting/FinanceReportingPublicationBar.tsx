"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { loadFinancePublicationInspectionAction } from "@/app/(admin)/dashboard/finance/reports/publication-actions";
import {
  FinanceManagementPnlPublicationDialog,
  type FinanceManagementPnlPublicationLabels,
} from "@/components/admin/finance/reporting/FinanceManagementPnlPublicationDialog";
import {
  FinancePublicationInspectionSheet,
  type FinancePublicationInspectionLabels,
} from "@/components/admin/finance/reporting/FinancePublicationInspectionSheet";
import { FinancePublicationHistorySheet } from "@/components/admin/finance/reporting/FinancePublicationHistorySheet";
import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";
import type { ComponentProps } from "react";
import type { FinancePublicationFastShareLabels } from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";
import type { FinancePublicationShareManagementLabels } from "@/components/admin/finance/reporting/FinancePublicationShareManagement";

type PnlLabels = ComponentProps<typeof FinanceManagementPnlPanel>["labels"];

import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";

export type FinancePublicationHistoryLabels = {
  historyAction: string;
  historyTitle: string;
  openVersion: string;
  versionLabel: string;
  publishedAtLabel: string;
  statusPublished: string;
  statusSuperseded: string;
  downloadPdf: string;
  close: string;
  loading: string;
  loadingMore: string;
  loadOlder: string;
  empty: string;
};

type Props = {
  financeYearId: string;
  financeYearName: string;
  formattingLocale: string;
  canPublish: boolean;
  canShare?: boolean;
  canRevokeShares?: boolean;
  reportPublishable: boolean;
  publicationSummary: SerializedFinancePublicationSummaryReadModel | null;
  publicationLabels: FinanceManagementPnlPublicationLabels;
  inspectionLabels: FinancePublicationInspectionLabels;
  historyLabels?: FinancePublicationHistoryLabels;
  pnlLabels: PnlLabels;
  fastShareLabels?: FinancePublicationFastShareLabels;
  shareManagementLabels?: FinancePublicationShareManagementLabels;
};

export function FinanceReportingPublicationBar({
  financeYearId,
  financeYearName,
  formattingLocale,
  canPublish,
  canShare = false,
  canRevokeShares = false,
  reportPublishable,
  publicationSummary,
  publicationLabels,
  inspectionLabels,
  historyLabels,
  pnlLabels,
  fastShareLabels,
  shareManagementLabels,
}: Props) {
  const router = useRouter();
  const [, startInspectionTransition] = useTransition();
  const [shareReloadKey, setShareReloadKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [inspectionPresentation, setInspectionPresentation] =
    useState<FinancePublishedManagementPnlInspectionReadModel | null>(null);

  const publication = publicationSummary?.publications[0] ?? null;
  const publicationId = publication?.publicationId ?? null;
  const versionCount = publication?.versionCount ?? publication?.versions.length ?? 0;
  const showHistory = Boolean(historyLabels) && versionCount > 0 && publicationId;

  const openInspection = useCallback(
    async (input: { publicationId: string; versionNumber: number }) => {
      setHistoryOpen(false);
      setInspectionOpen(true);
      setInspectionLoading(true);
      setInspectionError(null);
      setInspectionPresentation(null);

      const result = await loadFinancePublicationInspectionAction({
        financeYearId,
        publicationId: input.publicationId,
        versionNumber: input.versionNumber,
      });

      startInspectionTransition(() => {
        setInspectionLoading(false);
        if (!result.ok) {
          setInspectionError(result.error);
          return;
        }
        if (!result.presentation) {
          setInspectionError(publicationLabels.inspectionEmpty);
          return;
        }
        setInspectionPresentation(result.presentation);
        router.refresh();
      });
    },
    [financeYearId, publicationLabels.inspectionEmpty, router, startInspectionTransition],
  );

  const resolvedHistoryLabels = historyLabels;

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-end gap-2"
        data-finance-publication-bar
        data-finance-publication-history={showHistory ? "visible" : "hidden"}
      >
        {showHistory && publicationId && resolvedHistoryLabels ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            aria-haspopup="dialog"
          >
            {resolvedHistoryLabels.historyAction}
          </Button>
        ) : null}

        {canPublish ? (
          <FinanceManagementPnlPublicationDialog
            financeYearId={financeYearId}
            financeYearName={financeYearName}
            canPublish={canPublish}
            reportPublishable={reportPublishable}
            labels={publicationLabels}
            onInspectPublished={(input) => void openInspection(input)}
            publicationId={publicationId}
          />
        ) : null}
      </div>

      {showHistory && publicationId && resolvedHistoryLabels ? (
        <FinancePublicationHistorySheet
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          publicationId={publicationId}
          financeYearName={financeYearName}
          formattingLocale={formattingLocale}
          historyLabels={resolvedHistoryLabels}
          canShare={canShare}
          canManageShares={canRevokeShares}
          fastShareLabels={fastShareLabels}
          shareManagementLabels={shareManagementLabels}
          shareReloadKey={shareReloadKey}
          onShareChanged={() => setShareReloadKey((k) => k + 1)}
          onOpenInspection={(input) => void openInspection(input)}
        />
      ) : null}

      <FinancePublicationInspectionSheet
        open={inspectionOpen}
        onClose={() => setInspectionOpen(false)}
        loading={inspectionLoading}
        error={inspectionError}
        presentation={inspectionPresentation}
        formattingLocale={formattingLocale}
        labels={inspectionLabels}
        pnlLabels={pnlLabels}
        canShare={canShare}
        canRevokeShares={canRevokeShares}
        fastShareLabels={fastShareLabels}
        shareManagementLabels={shareManagementLabels}
        shareReloadKey={shareReloadKey}
        onShareCreated={() => setShareReloadKey((k) => k + 1)}
      />
    </>
  );
}
