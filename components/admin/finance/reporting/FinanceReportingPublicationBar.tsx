"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PopoverContent } from "@/components/ui/Popover";
import { loadFinancePublicationInspectionAction } from "@/app/(admin)/dashboard/finance/reports/publication-actions";
import {
  FinanceManagementPnlPublicationDialog,
  type FinanceManagementPnlPublicationLabels,
} from "@/components/admin/finance/reporting/FinanceManagementPnlPublicationDialog";
import {
  FinancePublicationInspectionSheet,
  type FinancePublicationInspectionLabels,
} from "@/components/admin/finance/reporting/FinancePublicationInspectionSheet";
import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import type { SerializedFinancePublicationSummaryReadModel } from "@/lib/finance/presentation/serialize-finance-publication-summary";
import type { ComponentProps } from "react";
import type { FinancePublicationFastShareLabels } from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";
import type { FinancePublicationShareManagementLabels } from "@/components/admin/finance/reporting/FinancePublicationShareManagement";
import { FinancePublicationFastShareButton } from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";

type PnlLabels = ComponentProps<typeof FinanceManagementPnlPanel>["labels"];

import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import { FinancePublicationPdfDownloadButton } from "@/components/admin/finance/reporting/FinancePublicationPdfDownloadButton";

export type FinancePublicationHistoryLabels = {
  historyAction: string;
  historyTitle: string;
  openVersion: string;
  versionLabel: string;
  publishedAtLabel: string;
  statusPublished: string;
  statusSuperseded: string;
  downloadPdf: string;
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

function formatPublishedAt(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

function statusLabel(status: string, labels: FinancePublicationHistoryLabels): string | null {
  if (status === "PUBLISHED") return labels.statusPublished;
  if (status === "SUPERSEDED") return labels.statusSuperseded;
  return null;
}

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
  const historyAnchorRef = useRef<HTMLButtonElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [inspectionPresentation, setInspectionPresentation] =
    useState<FinancePublishedManagementPnlInspectionReadModel | null>(null);

  const versionEntries = useMemo(() => {
    if (!publicationSummary || publicationSummary.availability !== "AVAILABLE") {
      return [];
    }
    const publication = publicationSummary.publications[0];
    if (!publication) return [];
    return [...publication.versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [publicationSummary]);

  const showHistory = Boolean(historyLabels) && versionEntries.length > 0;

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

  const publicationId = publicationSummary?.publications[0]?.publicationId ?? null;
  const resolvedHistoryLabels = historyLabels;

  return (
    <>
      <div
        className="flex flex-wrap items-center justify-end gap-2"
        data-finance-publication-bar
        data-finance-publication-history={showHistory ? "visible" : "hidden"}
      >
        {showHistory && publicationId && resolvedHistoryLabels ? (
          <>
            <Button
              ref={historyAnchorRef}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
              aria-haspopup="dialog"
            >
              {resolvedHistoryLabels.historyAction}
            </Button>
            <PopoverContent
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              anchorRef={historyAnchorRef}
              role="dialog"
              placement="bottom-end"
              matchAnchorWidth={false}
              constrainHeight={false}
              className="w-[min(100vw-2rem,22rem)] p-0"
              data-finance-publication-history-panel
            >
              <div className="border-b border-[var(--sce-surface-border-subtle)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {resolvedHistoryLabels.historyTitle}
                </p>
                <p className="text-xs text-[var(--muted)]">{financeYearName}</p>
              </div>
              <ul className="max-h-64 overflow-y-auto py-1" role="list">
                {versionEntries.map((version) => {
                  const status = statusLabel(version.lifecycleStatus, resolvedHistoryLabels);
                  return (
                    <li
                      key={version.versionNumber}
                      className="px-4 py-3 text-sm hover:bg-[var(--surface-1)]"
                      data-finance-publication-history-version={version.versionNumber}
                      data-finance-publication-lifecycle={version.lifecycleStatus}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-[var(--foreground)]">
                          {resolvedHistoryLabels.versionLabel.replace(
                            "{version}",
                            String(version.versionNumber),
                          )}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {resolvedHistoryLabels.publishedAtLabel}:{" "}
                          {formatPublishedAt(version.publishedAt, formattingLocale)}
                          {status ? ` · ${status}` : null}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            void openInspection({
                              publicationId,
                              versionNumber: version.versionNumber,
                            })
                          }
                        >
                          {resolvedHistoryLabels.openVersion}
                        </Button>
                        <FinancePublicationPdfDownloadButton
                          publicationId={publicationId}
                          versionNumber={version.versionNumber}
                          label={resolvedHistoryLabels.downloadPdf}
                        />
                        {canShare && fastShareLabels ? (
                          <FinancePublicationFastShareButton
                            publicationId={publicationId}
                            versionNumber={version.versionNumber}
                            financeYearName={financeYearName}
                            labels={fastShareLabels}
                            reloadKey={shareReloadKey}
                            onShareChanged={() => setShareReloadKey((k) => k + 1)}
                          />
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </>
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
