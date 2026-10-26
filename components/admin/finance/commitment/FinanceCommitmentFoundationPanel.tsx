"use client";

import { useTranslations } from "next-intl";
import {
  FINANCE_FUNCTIONAL_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";
import type { FinanceCommitmentFoundationReadModel } from "@/lib/finance/services/finance-commitment-foundation-query-service";
import { cn } from "@/lib/cn";

type FinanceCommitmentFoundationPanelProps = {
  model: FinanceCommitmentFoundationReadModel;
};

export function FinanceCommitmentFoundationPanel({
  model,
}: FinanceCommitmentFoundationPanelProps) {
  const t = useTranslations("Finance.commitments.foundation");

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
              {t("commitmentsLabel")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {model.counts.commitmentCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {t("pendingApprovalLabel")}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {model.counts.pendingApprovalCount}
            </dd>
          </div>
        </dl>
      </section>

      <section className={cn(FINANCE_FUNCTIONAL_SURFACE_CLASS, "px-5 py-5 sm:px-6")}>
        <h3 className="text-sm font-semibold">{t("capabilitiesTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>{model.capabilities.canManage ? t("capManage") : t("capManageOff")}</li>
          <li>{model.capabilities.canSubmit ? t("capSubmit") : t("capSubmitOff")}</li>
          <li>{model.capabilities.canApprove ? t("capApprove") : t("capApproveOff")}</li>
          <li>
            {model.capabilities.canManagePolicy ? t("capPolicy") : t("capPolicyOff")}
          </li>
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">{t("foundationNote")}</p>
      </section>
    </div>
  );
}
