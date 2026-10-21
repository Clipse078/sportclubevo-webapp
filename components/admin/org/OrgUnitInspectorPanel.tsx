"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, X, Plus, ExternalLink, Move, Trash2, ChevronRight } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { OrgUnitTypeSceIcon } from "@/components/icons/OrgUnitTypeSceIcon";
import type { OrgUnitCanvasNodeData } from "@/components/admin/org/OrgUnitNodeCard";
import type { SceOrgUnitPreviewModel } from "@/lib/org/org-unit-preview-model";
import OrgUnitReparentDialog from "@/components/admin/org/OrgUnitReparentDialog";
import OrgUnitBuilderDeleteDialog from "@/components/admin/org/OrgUnitBuilderDeleteDialog";
import OrgUnitInspectorPeoplePanel from "@/components/admin/org/OrgUnitInspectorPeoplePanel";
import SceOrgUnitPersonRow from "@/components/sce/org/SceOrgUnitPersonRow";
import type { OrgHierarchyUnit } from "@/lib/org/org-hierarchy-layout";
import type { OrgUnitPersonIdentity } from "@/lib/org/org-unit-people";
import { pickInspectorStaffPreview } from "@/lib/org/org-unit-people";

export type OrgUnitInspectorUnit = OrgUnitCanvasNodeData & {
  key: string;
  parentId: string | null;
  parentName: string | null;
  description: string | null;
  membershipCount: number;
  childUnits: { id: string; name: string; type: string }[];
  previewModel: SceOrgUnitPreviewModel;
  allStaff: OrgUnitPersonIdentity[];
};

type ParentOption = { id: string; key: string; name: string; level: number; type: string };

type Props = {
  unit: OrgUnitInspectorUnit | null;
  canManage: boolean;
  hierarchyUnits: Pick<OrgHierarchyUnit, "id" | "parentId">[];
  parentOptions: ParentOption[];
  onClose: () => void;
  onAddChild: (parentId: string) => void;
  onFocusChild?: (childId: string) => void;
  peopleViewOpen?: boolean;
  onPeopleViewOpenChange?: (open: boolean) => void;
};

export default function OrgUnitInspectorPanel({
  unit,
  canManage,
  hierarchyUnits,
  parentOptions,
  onClose,
  onAddChild,
  onFocusChild,
  peopleViewOpen = false,
  onPeopleViewOpenChange,
}: Props) {
  const router = useRouter();
  const [reparentOpen, setReparentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  if (!unit) return null;

  if (peopleViewOpen) {
    return (
      <aside
        className="flex h-full min-h-0 w-full shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface-1)]/95 lg:w-[min(100%,22rem)] lg:max-w-sm"
        aria-label="Mitarbeitende der Organisationseinheit"
      >
        <OrgUnitInspectorPeoplePanel
          orgUnitName={unit.name}
          people={unit.allStaff}
          onBack={() => onPeopleViewOpenChange?.(false)}
        />
      </aside>
    );
  }

  const staffPreview = pickInspectorStaffPreview({ allPeople: unit.allStaff });
  const typeLabel = unit.previewModel.typeLabel;

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
          <header className="flex items-start gap-2.5">
            <OrgUnitTypeSceIcon type={unit.type} className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-primary)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-[var(--text-1)]">{unit.name}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {typeLabel}
              </p>
            </div>
          </header>

          <section aria-labelledby="org-inspector-lead">
            <h3
              id="org-inspector-lead"
              className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
            >
              Leitung
            </h3>
            {unit.previewModel.responsibility.primary ? (
              <div className="flex items-center gap-2.5">
                <AdminAvatar name={unit.previewModel.responsibility.primary.displayName} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-1)]">
                    {unit.previewModel.responsibility.primary.displayName}
                  </p>
                  {unit.previewModel.responsibility.primaryRoleLabel ? (
                    <p className="text-xs text-[var(--muted)]">
                      {unit.previewModel.responsibility.primaryRoleLabel}
                    </p>
                  ) : null}
                  {unit.previewModel.responsibility.additionalPrimaryCount > 0 ? (
                    <p className="text-xs text-[var(--sce-primary)]">
                      + {unit.previewModel.responsibility.additionalPrimaryCount} weitere
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">{unit.previewModel.responsibility.emptyLabel}</p>
            )}
          </section>

          <section aria-labelledby="org-inspector-staff">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <h3
                id="org-inspector-staff"
                className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
              >
                Mitarbeitende · {unit.previewModel.staff.totalCount}
              </h3>
              {unit.previewModel.staff.totalCount > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--sce-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
                  data-testid="org-inspector-view-all-staff"
                  onClick={() => onPeopleViewOpenChange?.(true)}
                >
                  Alle anzeigen →
                </button>
              ) : null}
            </div>
            {unit.previewModel.staff.totalCount > 0 ? (
              <ul className="space-y-0">
                {staffPreview.visible.map((p) => (
                  <li key={p.identityKey}>
                    <SceOrgUnitPersonRow
                      personId={p.personId}
                      displayName={p.displayName}
                      functionTitle={p.functionTitle}
                      metaLine={p.teamLabels.length > 0 ? p.teamLabels.join(" · ") : null}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted)]">{unit.previewModel.staff.emptyLabel}</p>
            )}
          </section>

          {unit.childUnits.length > 0 ? (
            <section aria-labelledby="org-inspector-structure">
              <h3
                id="org-inspector-structure"
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
              >
                Struktur · {unit.childUnits.length}
              </h3>
              <ul className="space-y-0.5">
                {unit.childUnits.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text-1)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
                      data-testid={`org-inspector-child-${child.id}`}
                      onClick={() => onFocusChild?.(child.id)}
                    >
                      <span className="truncate">{child.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="org-inspector-details">
            <h3
              id="org-inspector-details"
              className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
            >
              Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-[var(--muted)]">Typ</dt>
                <dd className="text-[var(--text-1)]">{typeLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Übergeordnet</dt>
                <dd className="text-[var(--text-1)]">{unit.parentName ?? "— (Haupteinheit)"}</dd>
              </div>
              {unit.description ? (
                <div>
                  <dt className="text-xs text-[var(--muted)]">Beschreibung</dt>
                  <dd className="text-[var(--text-2)]">{unit.description}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <div className="flex flex-col gap-2 pt-1">
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
            <div className="border-t border-[var(--border)] pt-4">
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

          <section className="border-t border-[var(--border)] pt-3">
            <button
              type="button"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
              aria-expanded={technicalOpen}
              onClick={() => setTechnicalOpen((v) => !v)}
            >
              Technische Informationen {technicalOpen ? "▾" : "▸"}
            </button>
            {technicalOpen ? (
              <dl className="mt-2 space-y-2 text-xs">
                <div>
                  <dt className="text-[var(--muted)]">Key</dt>
                  <dd className="font-mono text-[var(--text-1)]">{unit.key}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Interne ID</dt>
                  <dd className="font-mono text-[var(--text-1)]">{unit.id}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">OrgUnit-Mitgliedschaften</dt>
                  <dd className="text-[var(--text-1)]">{unit.membershipCount}</dd>
                </div>
              </dl>
            ) : null}
          </section>
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
