"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { loadFinancePublicationVersionHistoryAction } from "@/app/(admin)/dashboard/finance/reports/publication-actions";
import { FinancePublicationPdfDownloadButton } from "@/components/admin/finance/reporting/FinancePublicationPdfDownloadButton";
import {
  FinancePublicationFastShareButton,
  type FinancePublicationFastShareLabels,
} from "@/components/admin/finance/reporting/FinancePublicationFastShareButton";
import {
  FinancePublicationShareManagement,
  type FinancePublicationShareManagementLabels,
} from "@/components/admin/finance/reporting/FinancePublicationShareManagement";
import type { FinancePublicationHistoryLabels } from "@/components/admin/finance/reporting/FinanceReportingPublicationBar";
import type { FinancePublicationVersionHistoryEntry } from "@/lib/finance/services/finance-publication-query-service";
import {
  FinancePublicationDistributionDialog,
  type FinancePublicationDistributionLabels,
} from "@/components/admin/finance/reporting/FinancePublicationDistributionDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  publicationId: string;
  financeYearName: string;
  formattingLocale: string;
  historyLabels: FinancePublicationHistoryLabels;
  canShare: boolean;
  canManageShares: boolean;
  canDistribute?: boolean;
  distributionLabels?: FinancePublicationDistributionLabels;
  fastShareLabels?: FinancePublicationFastShareLabels;
  shareManagementLabels?: FinancePublicationShareManagementLabels;
  shareReloadKey: number;
  onShareChanged: () => void;
  onOpenInspection: (input: { publicationId: string; versionNumber: number }) => void;
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

export function FinancePublicationHistorySheet({
  open,
  onClose,
  publicationId,
  financeYearName,
  formattingLocale,
  historyLabels,
  canShare,
  canManageShares,
  canDistribute = false,
  distributionLabels,
  fastShareLabels,
  shareManagementLabels,
  shareReloadKey,
  onShareChanged,
  onOpenInspection,
}: Props) {
  const [versions, setVersions] = useState<FinancePublicationVersionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOlder, setHasOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [manageVersion, setManageVersion] = useState<number | null>(null);
  const [distributeVersion, setDistributeVersion] = useState<{
    versionNumber: number;
    publishedAt: string | null;
  } | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadFinancePublicationVersionHistoryAction({ publicationId });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setVersions([]);
      setHasOlder(false);
      setNextCursor(null);
      return;
    }
    setVersions([...result.versions]);
    setHasOlder(result.hasOlder);
    setNextCursor(result.nextCursorVersionNumber);
  }, [publicationId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadInitial();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInitial, open, shareReloadKey]);

  const handleClose = useCallback(() => {
    setManageVersion(null);
    onClose();
  }, [onClose]);

  const loadOlder = useCallback(async () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    const result = await loadFinancePublicationVersionHistoryAction({
      publicationId,
      cursorVersionNumber: nextCursor,
    });
    setLoadingMore(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setVersions((prev) => [...prev, ...result.versions]);
    setHasOlder(result.hasOlder);
    setNextCursor(result.nextCursorVersionNumber);
  }, [loadingMore, nextCursor, publicationId]);

  const manageDialogTitle =
    manageVersion != null && shareManagementLabels
      ? shareManagementLabels.dialogTitle.replace("{version}", String(manageVersion))
      : shareManagementLabels?.sectionTitle ?? "";

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title={historyLabels.historyTitle}
        description={financeYearName}
        panelClassName="w-full sm:w-[min(100vw-1rem,28rem)] md:w-[min(100vw-1rem,32rem)] lg:w-[min(100vw-1rem,36rem)]"
        footer={
          <Button type="button" variant="secondary" onClick={handleClose}>
            {historyLabels.close}
          </Button>
        }
      >
        <div
          className="flex min-h-0 flex-1 flex-col gap-0"
          data-finance-publication-history-panel
        >
          {loading ? (
            <p className="text-sm text-[var(--muted)]" aria-live="polite">
              {historyLabels.loading}
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && versions.length === 0 && !error ? (
            <p className="text-sm text-[var(--muted)]">{historyLabels.empty}</p>
          ) : null}

          <ul className="divide-y divide-[var(--sce-surface-border-subtle)]" role="list">
            {versions.map((version) => {
              const lifecycle = statusLabel(version.lifecycleStatus, historyLabels);
              return (
                <li
                  key={version.versionNumber}
                  className="py-4 first:pt-0"
                  data-finance-publication-history-version={version.versionNumber}
                  data-finance-publication-lifecycle={version.lifecycleStatus}
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {historyLabels.versionLabel.replace(
                        "{version}",
                        String(version.versionNumber),
                      )}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {lifecycle ? (
                        <span className="font-medium uppercase tracking-wide">{lifecycle}</span>
                      ) : null}
                      {lifecycle ? " · " : null}
                      {formatPublishedAt(version.publishedAt, formattingLocale)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        handleClose();
                        onOpenInspection({
                          publicationId,
                          versionNumber: version.versionNumber,
                        });
                      }}
                    >
                      {historyLabels.openVersion}
                    </Button>
                    <FinancePublicationPdfDownloadButton
                      publicationId={publicationId}
                      versionNumber={version.versionNumber}
                      label={historyLabels.downloadPdf}
                    />
                    {canShare && fastShareLabels ? (
                      <FinancePublicationFastShareButton
                        publicationId={publicationId}
                        versionNumber={version.versionNumber}
                        financeYearName={financeYearName}
                        labels={fastShareLabels}
                        reloadKey={shareReloadKey}
                        onShareChanged={onShareChanged}
                      />
                    ) : null}
                    {canDistribute && distributionLabels ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-finance-publication-distribute-trigger
                        onClick={() =>
                          setDistributeVersion({
                            versionNumber: version.versionNumber,
                            publishedAt: version.publishedAt,
                          })
                        }
                      >
                        {distributionLabels.sendAction}
                      </Button>
                    ) : null}
                    {canManageShares && shareManagementLabels ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-finance-publication-share-manage-trigger
                        onClick={() => setManageVersion(version.versionNumber)}
                      >
                        {shareManagementLabels.manageAction}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasOlder ? (
            <div className="border-t border-[var(--sce-surface-border-subtle)] pt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loadingMore}
                onClick={() => void loadOlder()}
                data-finance-publication-history-load-older
              >
                {loadingMore ? historyLabels.loadingMore : historyLabels.loadOlder}
              </Button>
            </div>
          ) : null}
        </div>
      </Sheet>

      {distributionLabels && distributeVersion != null ? (
        <FinancePublicationDistributionDialog
          open
          onClose={() => setDistributeVersion(null)}
          publicationId={publicationId}
          versionNumber={distributeVersion.versionNumber}
          financeYearName={financeYearName}
          publishedAtLabel={formatPublishedAt(distributeVersion.publishedAt, formattingLocale)}
          formattingLocale={formattingLocale}
          labels={{
            ...distributionLabels,
            cancel: historyLabels.close,
            close: historyLabels.close,
          }}
        />
      ) : null}

      {shareManagementLabels && manageVersion != null ? (
        <Dialog
          open
          onClose={() => setManageVersion(null)}
          title={manageDialogTitle}
          footer={
            <Button type="button" variant="secondary" onClick={() => setManageVersion(null)}>
              {historyLabels.close}
            </Button>
          }
        >
          <FinancePublicationShareManagement
            publicationId={publicationId}
            versionNumber={manageVersion}
            formattingLocale={formattingLocale}
            labels={shareManagementLabels}
            canRevoke={canManageShares}
            canCreateShare={canShare}
            reloadKey={shareReloadKey}
            active
            onShareChanged={onShareChanged}
          />
        </Dialog>
      ) : null}
    </>
  );
}
