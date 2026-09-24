"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PlanningResourceType } from "@prisma/client";

type LinkedRequirement = {
  referenceId: string;
  requirementId: string;
  title: string;
  status: string;
  href: string;
};

type Props = {
  locale: string;
  resourceType: PlanningResourceType;
  resourceId: string;
  requirements: LinkedRequirement[];
  canLink?: boolean;
  canUnlink?: boolean;
};

export default function ContextRelatedRequirementsPanelView({
  locale: _locale,
  resourceType,
  resourceId,
  requirements,
  canLink = false,
  canUnlink = false,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.requirements");

  const createHref = `/dashboard/aufgaben/anforderungen/neu?planningResourceType=${encodeURIComponent(resourceType)}&planningResourceId=${encodeURIComponent(resourceId)}`;

  return (
    <section
      className="space-y-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4"
      data-testid="context-related-requirements-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{t("heading")}</h3>
        {canLink ? (
          <Link
            href={createHref}
            className="fca-button-secondary !min-h-8 !px-2.5 !py-1 text-xs"
            data-testid="context-related-requirements-create"
          >
            {t("create")}
          </Link>
        ) : null}
      </div>

      {requirements.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="context-related-requirements-empty">
          {t("emptyLinked")}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="context-related-requirements-list">
          {requirements.map((req) => (
            <li key={req.referenceId}>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)]/60 px-3 py-2 text-sm">
                <Link
                  href={req.href}
                  className="min-w-0 flex-1 hover:underline"
                  data-testid={`context-related-requirement-${req.requirementId}`}
                >
                  <span className="font-medium text-[var(--foreground)]">{req.title}</span>
                  <span className="ml-2 text-xs text-[var(--text-2)]">{req.status}</span>
                </Link>
                {canUnlink ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--destructive)] hover:underline"
                    data-testid={`context-related-requirement-unlink-${req.referenceId}`}
                    onClick={async () => {
                      await fetch(`/api/planning/requirement-links/${req.referenceId}`, {
                        method: "DELETE",
                      });
                      window.location.reload();
                    }}
                  >
                    {t("unlink")}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

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
