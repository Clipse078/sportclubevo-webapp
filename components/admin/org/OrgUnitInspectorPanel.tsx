"use client";

import Link from "next/link";
import { Pencil, X, Plus, ExternalLink } from "lucide-react";
import OrgUnitNodeCard, { type OrgUnitCanvasNodeData } from "@/components/admin/org/OrgUnitNodeCard";

export type OrgUnitInspectorUnit = OrgUnitCanvasNodeData & {
  key: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  childUnits: { id: string; name: string; type: string }[];
};

type Props = {
  unit: OrgUnitInspectorUnit | null;
  canManage: boolean;
  onClose: () => void;
  onAddChild: (parentId: string) => void;
};

export default function OrgUnitInspectorPanel({
  unit,
  canManage,
  onClose,
  onAddChild,
}: Props) {
  if (!unit) return null;

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-[var(--border)] bg-[var(--surface-1)]/95 lg:w-[min(100%,22rem)] lg:max-w-sm"
      aria-label="Organisationseinheit Details"
      data-testid="org-unit-inspector"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-1)]">Einheit</h2>
        <button
          type="button"
          className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
          aria-label="Auswahl aufheben"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        <div className="pointer-events-none h-[68px]">
          <OrgUnitNodeCard
            unit={unit}
            selected
            canManage={false}
            onSelect={() => {}}
            onToggleCollapse={() => {}}
            tabIndex={-1}
          />
        </div>

        {unit.description ? (
          <p className="text-sm text-[var(--text-2)]">{unit.description}</p>
        ) : null}

        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Key</dt>
            <dd className="font-mono text-[var(--text-1)]">{unit.key}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Übergeordnet
            </dt>
            <dd className="text-[var(--text-1)]">{unit.parentName ?? "— (Haupteinheit)"}</dd>
          </div>
        </dl>

        {unit.childUnits.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Untereinheiten
            </h3>
            <ul className="space-y-1">
              {unit.childUnits.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/dashboard/org-units/${child.id}`}
                    className="block rounded-lg px-2 py-1.5 text-sm text-[var(--sce-primary)] hover:bg-[var(--surface-2)]"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={`/dashboard/org-units/${unit.id}`}
            className="fca-button-secondary inline-flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Detailseite
          </Link>
          {canManage ? (
            <>
              <Link
                href={`/dashboard/org-units/${unit.id}/edit`}
                className="fca-button-secondary inline-flex items-center justify-center gap-2"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Bearbeiten
              </Link>
              <button
                type="button"
                className="fca-button-primary inline-flex items-center justify-center gap-2"
                onClick={() => onAddChild(unit.id)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Untereinheit hinzufügen
              </button>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
