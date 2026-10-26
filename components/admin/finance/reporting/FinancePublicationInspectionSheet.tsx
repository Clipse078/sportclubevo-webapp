"use client";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import { FinancePublicationPdfDownloadButton } from "@/components/admin/finance/reporting/FinancePublicationPdfDownloadButton";
import {
  FinancePublicationShareDialog,
  type FinancePublicationShareDialogLabels,
} from "@/components/admin/finance/reporting/FinancePublicationShareDialog";
import {
  FinancePublicationShareManagement,
  type FinancePublicationShareManagementLabels,
} from "@/components/admin/finance/reporting/FinancePublicationShareManagement";
import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import type { ComponentProps } from "react";

export type FinancePublicationInspectionLabels = {
  sheetTitle: string;
  frozenNotice: string;
  versionHeading: string;
  versionLabel: string;
  publishedAtLabel: string;
  contentTypeLabel: string;
  statusPublished: string;
  statusSuperseded: string;
  downloadPdf: string;
  close: string;
  shareableHint: string;
};

type PnlLabels = ComponentProps<typeof FinanceManagementPnlPanel>["labels"];

type Props = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  presentation: FinancePublishedManagementPnlInspectionReadModel | null;
  formattingLocale: string;
  labels: FinancePublicationInspectionLabels;
  pnlLabels: PnlLabels;
  canShare?: boolean;
  canRevokeShares?: boolean;
  shareDialogLabels?: FinancePublicationShareDialogLabels;
  shareManagementLabels?: FinancePublicationShareManagementLabels;
  shareReloadKey?: number;
  onShareCreated?: () => void;
};

function formatPublishedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

function lifecycleStatusLabel(
  status: string,
  labels: FinancePublicationInspectionLabels,
): string | null {
  if (status === "PUBLISHED") return labels.statusPublished;
  if (status === "SUPERSEDED") return labels.statusSuperseded;
  return null;
}

export function FinancePublicationInspectionSheet({
  open,
  onClose,
  loading,
  error,
  presentation,
  formattingLocale,
  labels,
  pnlLabels,
  canShare = false,
  canRevokeShares = false,
  shareDialogLabels,
  shareManagementLabels,
  shareReloadKey = 0,
  onShareCreated,
}: Props) {
  const identity = presentation?.identity;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={labels.sheetTitle}
      description={
        identity
          ? `${labels.contentTypeLabel} · ${identity.financeYearName}`
          : undefined
      }
      panelClassName="w-full sm:w-[min(100vw-1rem,720px)] md:w-[min(100vw-1rem,880px)] lg:w-[min(100vw-1rem,960px)]"
      footer={
        <Button type="button" onClick={onClose}>
          {labels.close}
        </Button>
      }
    >
      <div
        className="flex min-w-0 flex-col gap-6"
        data-finance-publication-inspection
        data-finance-publication-inspection-loading={loading ? "true" : undefined}
      >
        {loading ? (
          <p className="text-sm text-[var(--muted)]" aria-live="polite">
            …
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {presentation ? (
          <>
            <header className="space-y-3 border-b border-[var(--sce-surface-border-subtle)] pb-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  {labels.contentTypeLabel}
                </h2>
                <span className="text-sm text-[var(--muted)]">{identity!.financeYearName}</span>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted)]">{labels.versionHeading}</dt>
                  <dd className="font-medium text-[var(--foreground)]">
                    {labels.versionLabel.replace(
                      "{version}",
                      String(identity!.publicationVersion),
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">{labels.publishedAtLabel}</dt>
                  <dd className="font-medium text-[var(--foreground)]">
                    {formatPublishedAt(identity!.publishedAt, formattingLocale)}
                  </dd>
                </div>
              </dl>
              {lifecycleStatusLabel(identity!.lifecycleStatus, labels) ? (
                <p
                  className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
                  data-finance-publication-lifecycle={identity!.lifecycleStatus}
                >
                  {lifecycleStatusLabel(identity!.lifecycleStatus, labels)}
                </p>
              ) : null}
              <p className="max-w-prose text-sm text-[var(--muted)]">{labels.frozenNotice}</p>
              {labels.shareableHint ? (
                <p className="text-sm text-[var(--muted)]">{labels.shareableHint}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <FinancePublicationPdfDownloadButton
                  publicationId={identity!.publicationId}
                  versionNumber={identity!.publicationVersion}
                  label={labels.downloadPdf}
                />
                {canShare && shareDialogLabels ? (
                  <FinancePublicationShareDialog
                    publicationId={identity!.publicationId}
                    versionNumber={identity!.publicationVersion}
                    financeYearName={identity!.financeYearName}
                    publishedAtLabel={labels.publishedAtLabel}
                    publishedAtFormatted={formatPublishedAt(
                      identity!.publishedAt,
                      formattingLocale,
                    )}
                    labels={shareDialogLabels}
                    onShareCreated={onShareCreated}
                  />
                ) : null}
              </div>
            </header>

            {shareManagementLabels ? (
              <FinancePublicationShareManagement
                publicationId={identity!.publicationId}
                versionNumber={identity!.publicationVersion}
                formattingLocale={formattingLocale}
                labels={shareManagementLabels}
                canRevoke={canRevokeShares}
                reloadKey={shareReloadKey}
              />
            ) : null}

            <div data-finance-publication-inspection-pnl>
              <FinanceManagementPnlPanel
                model={presentation.pnl}
                formattingLocale={formattingLocale}
                canConfigureStructure={false}
                labels={pnlLabels}
              />
            </div>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
