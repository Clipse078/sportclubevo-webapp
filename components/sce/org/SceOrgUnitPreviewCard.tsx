"use client";

import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { OrgUnitTypeSceIcon } from "@/components/icons/OrgUnitTypeSceIcon";
import SceOrgUnitPersonRow from "@/components/sce/org/SceOrgUnitPersonRow";
import type { SceOrgUnitPreviewModel } from "@/lib/org/org-unit-preview-model";
import { cn } from "@/lib/cn";

type Props = {
  model: SceOrgUnitPreviewModel;
  unitType: string;
  className?: string;
  onOpenDetails?: () => void;
  onViewAllStaff?: () => void;
};

export default function SceOrgUnitPreviewCard({
  model,
  unitType,
  className,
  onOpenDetails,
  onViewAllStaff,
}: Props) {
  const { responsibility, staff } = model;

  return (
    <article
      className={cn(
        "w-[min(320px,calc(100vw-1.5rem))] rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/98 p-3 shadow-lg backdrop-blur-sm",
        "text-[length:13px] leading-snug text-[var(--text-2)]",
        className,
      )}
      data-testid="sce-org-unit-preview-card"
      data-org-contextual-preview-root
      aria-label={`${model.name}, ${model.typeLabel}`}
    >
      <header className="flex items-start gap-2.5">
        <OrgUnitTypeSceIcon type={unitType} className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-primary)]" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--text-1)]" title={model.name}>
            {model.name}
          </h3>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {model.typeLabel}
            {model.statusSuffix ? ` · ${model.statusSuffix}` : ""}
          </p>
        </div>
      </header>

      <section className="mt-2.5" aria-labelledby={`org-preview-lead-${model.unitId}`}>
        <h4
          id={`org-preview-lead-${model.unitId}`}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
        >
          Leitung
        </h4>
        {responsibility.primary ? (
          <div className="mt-1 flex items-center gap-2">
            <AdminAvatar name={responsibility.primary.displayName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--text-1)]">
                {responsibility.primary.displayName}
              </p>
              {responsibility.primaryRoleLabel ? (
                <p className="truncate text-xs text-[var(--muted)]">{responsibility.primaryRoleLabel}</p>
              ) : null}
              {responsibility.additionalPrimaryCount > 0 ? (
                <p className="text-[11px] text-[var(--sce-primary)]">
                  + {responsibility.additionalPrimaryCount} weitere
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-[var(--muted)]">{responsibility.emptyLabel}</p>
        )}
      </section>

      <section className="mt-2.5" aria-labelledby={`org-preview-staff-${model.unitId}`}>
        <h4
          id={`org-preview-staff-${model.unitId}`}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
        >
          Mitarbeitende
        </h4>
        {staff.totalCount > 0 ? (
          <ul className="mt-1 space-y-0">
            {staff.previewPeople.map((p) => (
              <li key={p.personId}>
                <SceOrgUnitPersonRow
                  personId={p.personId}
                  displayName={p.displayName}
                  functionTitle={p.functionTitle}
                />
              </li>
            ))}
            {staff.additionalCount > 0 ? (
              <li className="py-1 pl-9 text-xs text-[var(--muted)]">+ {staff.additionalCount} weitere</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-[var(--muted)]">{staff.emptyLabel}</p>
        )}
      </section>

      {model.structureLine ? (
        <p className="mt-2.5 text-[11px] text-[var(--muted)]">{model.structureLine}</p>
      ) : null}

      {onViewAllStaff && staff.totalCount > 0 ? (
        <button
          type="button"
          className="mt-2 text-left text-xs font-medium text-[var(--sce-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
          data-testid="org-preview-view-all-staff"
          onClick={onViewAllStaff}
        >
          Alle Mitarbeitenden ansehen →
        </button>
      ) : null}

      {onOpenDetails ? (
        <button
          type="button"
          className="mt-1.5 w-full text-left text-[11px] text-[var(--muted)] hover:text-[var(--text-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
          onClick={onOpenDetails}
        >
          Auswählen für Details
        </button>
      ) : null}
    </article>
  );
}
