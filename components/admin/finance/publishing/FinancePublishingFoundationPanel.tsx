"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import type { FinancePublishingFoundationReadModel } from "@/lib/finance/services/finance-publishing-foundation-query-service";
import { cn } from "@/lib/cn";

type FinancePublishingFoundationPanelProps = {
  model: FinancePublishingFoundationReadModel;
};

export function FinancePublishingFoundationPanel({
  model,
}: FinancePublishingFoundationPanelProps) {
  const t = useTranslations("Finance.publishing.foundation");

  return (
    <div className={FINANCE_WORKSPACE_STACK_CLASS}>
      <section className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "px-5 py-6 sm:px-6")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {t("description")}
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {t("publicationsLabel")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{model.counts.publicationCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {t("activeSharesLabel")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{model.counts.activeShareCount}</dd>
          </div>
        </dl>
      </section>

      <section className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "px-5 py-5 sm:px-6")}>
        <h3 className="text-sm font-semibold">{t("capabilitiesTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>{model.capabilities.canViewPublicationHistory ? t("capViewHistory") : t("capViewHistoryOff")}</li>
          <li>{model.capabilities.canShare ? t("capShare") : t("capShareOff")}</li>
          <li>{model.capabilities.canPublish ? t("capPublish") : t("capPublishOff")}</li>
          <li>{model.capabilities.canManageShares ? t("capManageShares") : t("capManageSharesOff")}</li>
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">{t("foundationNote")}</p>
        <p className="mt-4 text-sm">
          <Link href="/dashboard/finance/reports" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            {t("backToReports")}
          </Link>
        </p>
      </section>
    </div>
  );
}
