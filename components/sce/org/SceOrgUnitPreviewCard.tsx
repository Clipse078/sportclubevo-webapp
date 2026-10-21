"use client";

import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { OrgUnitTypeSceIcon } from "@/components/icons/OrgUnitTypeSceIcon";
import type { SceOrgUnitPreviewModel } from "@/lib/org/org-unit-preview-model";
import { cn } from "@/lib/cn";

type Props = {
  model: SceOrgUnitPreviewModel;
  unitType: string;
  className?: string;
  onOpenDetails?: () => void;
};

export default function SceOrgUnitPreviewCard({ model, unitType, className, onOpenDetails }: Props) {
  const { responsibility } = model;

  return (
    <article
      className={cn(
        "w-[min(340px,calc(100vw-1.5rem))] rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)]/98 p-4 shadow-xl backdrop-blur-md",
        "text-[length:13px] leading-snug text-[var(--text-2)]",
        className,
      )}
      data-testid="sce-org-unit-preview-card"
      data-org-contextual-preview-root
      aria-label={`${model.name}, ${model.typeLabel}`}
    >
      <header className="flex items-start gap-3">
        <OrgUnitTypeSceIcon type={unitType} className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sce-primary)]" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[var(--text-1)]" title={model.name}>
            {model.name}
          </h3>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {model.typeLabel}
            {model.statusSuffix ? ` · ${model.statusSuffix}` : ""}
          </p>
        </div>
      </header>

      <section className="mt-4" aria-labelledby={`org-preview-responsible-${model.unitId}`}>
        <h4
          id={`org-preview-responsible-${model.unitId}`}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
        >
          Verantwortlich
        </h4>
        {responsibility.primary ? (
          <div className="mt-2 flex items-center gap-3">
            <AdminAvatar name={responsibility.primary.displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--text-1)]" title={responsibility.primary.displayName}>
                {responsibility.primary.displayName}
              </p>
              {responsibility.primaryRoleLabel ? (
                <p className="truncate text-xs text-[var(--muted)]" title={responsibility.primaryRoleLabel}>
                  {responsibility.primaryRoleLabel}
                </p>
              ) : null}
              {responsibility.additionalPrimaryCount > 0 ? (
                <p className="text-xs text-[var(--sce-primary)]">
                  + {responsibility.additionalPrimaryCount} weitere
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">{responsibility.emptyLabel}</p>
        )}
      </section>

      {model.structureLine ? (
        <section className="mt-4" aria-labelledby={`org-preview-structure-${model.unitId}`}>
          <h4
            id={`org-preview-structure-${model.unitId}`}
            className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
          >
            Struktur
          </h4>
          <p className="mt-1.5 text-sm text-[var(--text-1)]">{model.structureLine}</p>
        </section>
      ) : null}

      {model.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-[var(--text-2)]">{model.description}</p>
      ) : null}

      {onOpenDetails ? (
        <button
          type="button"
          className="mt-4 w-full text-left text-xs font-medium text-[var(--sce-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
          onClick={onOpenDetails}
        >
          Klicken für Details
        </button>
      ) : (
        <p className="mt-4 text-xs text-[var(--muted)]">Klicken für Details</p>
      )}
    </article>
  );
}
