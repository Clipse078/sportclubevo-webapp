"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, X, Plus, ExternalLink, Move, Trash2 } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import OrgUnitNodeCard, { type OrgUnitCanvasNodeData } from "@/components/admin/org/OrgUnitNodeCard";
import type { SceOrgUnitPreviewModel } from "@/lib/org/org-unit-preview-model";
import OrgUnitReparentDialog from "@/components/admin/org/OrgUnitReparentDialog";
import OrgUnitBuilderDeleteDialog from "@/components/admin/org/OrgUnitBuilderDeleteDialog";
import type { OrgHierarchyUnit } from "@/lib/org/org-hierarchy-layout";

export type OrgUnitInspectorUnit = OrgUnitCanvasNodeData & {
  key: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  childUnits: { id: string; name: string; type: string }[];
  previewModel: SceOrgUnitPreviewModel;
};

type ParentOption = { id: string; key: string; name: string; level: number; type: string };

type Props = {
  unit: OrgUnitInspectorUnit | null;
  canManage: boolean;
  hierarchyUnits: Pick<OrgHierarchyUnit, "id" | "parentId">[];
  parentOptions: ParentOption[];
  onClose: () => void;
  onAddChild: (parentId: string) => void;
};

export default function OrgUnitInspectorPanel({
  unit,
  canManage,
  hierarchyUnits,
  parentOptions,
  onClose,
  onAddChild,
}: Props) {
  const router = useRouter();
  const [reparentOpen, setReparentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!unit) return null;

  return (
    <>
      <aside
        className="flex h-full min-h-0 w-full shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-1)]/95 lg:w-[min(100%,22rem)] lg:max-w-sm"
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="pointer-events-none h-[116px]">
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

          <section aria-labelledby="org-inspector-responsible">
            <h3
              id="org-inspector-responsible"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Verantwortlich
            </h3>
            {unit.previewModel.responsibility.primary ? (
              <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/80 p-3">
                <AdminAvatar name={unit.previewModel.responsibility.primary.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-1)]">
                    {unit.previewModel.responsibility.primary.displayName}
                  </p>
                  {unit.previewModel.responsibility.primaryRoleLabel ? (
                    <p className="text-sm text-[var(--muted)]">
                      {unit.previewModel.responsibility.primaryRoleLabel}
                    </p>
                  ) : null}
                  {unit.previewModel.responsibility.additionalPrimaryCount > 0 ? (
                    <p className="text-xs text-[var(--sce-primary)]">
                      + {unit.previewModel.responsibility.additionalPrimaryCount} weitere primäre
                      Verantwortliche
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">{unit.previewModel.responsibility.emptyLabel}</p>
            )}
            {unit.previewModel.structureLine ? (
              <p className="mt-2 text-sm text-[var(--text-2)]">{unit.previewModel.structureLine}</p>
            ) : null}
          </section>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Key</dt>
              <dd className="font-mono text-[var(--text-1)]">{unit.key}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Übergeordnet
              </dt>
              <dd className="text-[var(--text-1)]">{unit.parentName ?? "— (Haupteinheit)"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Typ</dt>
              <dd className="text-[var(--text-1)]">{unit.type}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Untereinheiten
              </dt>
              <dd className="text-[var(--text-1)]">{unit.childCount}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mitglieder</dt>
              <dd className="text-[var(--text-1)]">{unit.memberCount}</dd>
            </div>
          </dl>

          {unit.childUnits.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Direkte Untereinheiten
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
                  className="fca-button-secondary inline-flex items-center justify-center gap-2"
                  onClick={() => onAddChild(unit.id)}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Untereinheit hinzufügen
                </button>
                <button
                  type="button"
                  className="fca-button-secondary inline-flex items-center justify-center gap-2"
                  data-testid="org-inspector-reparent"
                  onClick={() => setReparentOpen(true)}
                >
                  <Move className="h-4 w-4" aria-hidden />
                  Übergeordnete Einheit ändern
                </button>
              </>
            ) : null}
          </div>

          {canManage ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                data-testid="org-inspector-delete"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Einheit löschen
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {canManage ? (
        <>
          <OrgUnitReparentDialog
            open={reparentOpen}
            onClose={() => setReparentOpen(false)}
            unitId={unit.id}
            unitName={unit.name}
            currentParentId={unit.parentId}
            hierarchyUnits={hierarchyUnits}
            parentOptions={parentOptions}
            onSuccess={() => {
              setReparentOpen(false);
              router.refresh();
            }}
          />
          <OrgUnitBuilderDeleteDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            orgUnitId={unit.id}
            orgUnitName={unit.name}
            directChildIds={unit.childUnits.map((c) => c.id)}
            hierarchyUnits={hierarchyUnits}
            parentOptions={parentOptions}
            onDeleted={() => {
              onClose();
              router.push("/dashboard/org-units");
              router.refresh();
            }}
          />
        </>
      ) : null}
    </>
  );
}
