"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type Props = {
  locale: string;
  canCreate?: boolean;
};

/**
 * Anforderungen (Requirements) have no canonical operational context reference on planning
 * events yet (unlike Aufgaben contextType/contextId). This boundary documents the gap and
 * links to the Requirements center without inventing orphan requirements.
 */
export default function ContextRelatedRequirementsPanelView({
  locale: _locale,
  canCreate = false,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.requirements");

  return (
    <section
      className="space-y-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4"
      data-testid="context-related-requirements-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("heading")}</h3>
        {canCreate ? (
          <Link
            href="/dashboard/aufgaben/anforderungen/neu"
            className="fca-button-secondary !min-h-8 !px-2.5 !py-1 text-xs"
            data-testid="context-related-requirements-create"
          >
            {t("create")}
          </Link>
        ) : null}
      </div>
      <p className="text-sm text-[var(--text-2)]" data-testid="context-related-requirements-gap">
        {t("gapDescription")}
      </p>
      <Link
        href="/dashboard/aufgaben?tab=anforderungen"
        className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
        data-testid="context-related-requirements-center-link"
      >
        {t("openCenter")}
      </Link>
    </section>
  );
}
