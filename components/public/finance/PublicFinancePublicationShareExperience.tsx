"use client";

import { FinanceManagementPnlPanel } from "@/components/admin/finance/reporting/FinanceManagementPnlPanel";
import type { FinancePublishedManagementPnlInspectionReadModel } from "@/lib/finance/presentation/build-finance-published-management-pnl-read-model";
import type { ComponentProps } from "react";
type PnlLabels = ComponentProps<typeof FinanceManagementPnlPanel>["labels"];

export type PublicFinancePublicationShareLabels = {
  unavailable: string;
  officialPublication: string;
  versionLabel: string;
  publishedAtLabel: string;
  statusPublished: string;
  frozenNotice: string;
  downloadPdf: string;
};

type Props = {
  model: {
    tenantName: string;
    tenantLogoUrl: string | null;
    formattingLocale: string;
    presentation: FinancePublishedManagementPnlInspectionReadModel;
    versionNumber: number;
    pdfDownloadPath: string;
  } | null;
  labels: PublicFinancePublicationShareLabels;
  pnlLabels: PnlLabels;
};

function formatPublishedAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function PublicFinancePublicationShareExperience({ model, labels, pnlLabels }: Props) {
  if (!model) {
    return (
      <main
        className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center"
        data-finance-publication-share-unavailable
      >
        <p className="text-sm text-[var(--muted)]">{labels.unavailable}</p>
      </main>
    );
  }

  const identity = model.presentation.identity;

  return (
    <main
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12"
      data-finance-publication-share-view
      data-finance-publication-version={model.versionNumber}
    >
      <header className="mb-8 space-y-4 border-b border-[var(--sce-surface-border-subtle)] pb-6">
        <div className="flex flex-wrap items-center gap-3">
          {model.tenantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.tenantLogoUrl}
              alt=""
              className="h-10 w-10 rounded-md object-contain"
            />
          ) : null}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {model.tenantName}
            </p>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              {identity.title || identity.financeYearName}
            </h1>
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">{labels.officialPublication}</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {labels.versionLabel.replace("{version}", String(model.versionNumber))}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">{labels.publishedAtLabel}</dt>
            <dd className="font-medium text-[var(--foreground)]">
              {formatPublishedAt(identity.publishedAt, model.formattingLocale)}
            </dd>
          </div>
        </dl>
        <p
          className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
          data-finance-publication-lifecycle={identity.lifecycleStatus}
        >
          {labels.statusPublished}
        </p>
        <p className="max-w-prose text-sm text-[var(--muted)]">{labels.frozenNotice}</p>
        <div>
          <a
            href={model.pdfDownloadPath}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            data-finance-publication-share-pdf
          >
            {labels.downloadPdf}
          </a>
        </div>
      </header>
      <div data-finance-publication-share-pnl>
        <FinanceManagementPnlPanel
          model={model.presentation.pnl}
          formattingLocale={model.formattingLocale}
          canConfigureStructure={false}
          labels={pnlLabels}
        />
      </div>
    </main>
  );
}
