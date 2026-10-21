"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deriveOrgUnitPeopleFromAssignments } from "@/lib/org/org-unit-people";
import OrgUnitSearchableList from "@/components/admin/org/OrgUnitSearchableList";
import OrgUnitCanvasView, { type OrgUnitCanvasItem } from "@/components/admin/org/OrgUnitCanvasView";
import type { OrgUnitBuilderEnrichmentMap } from "@/lib/org/org-unit-builder-enrichment";
import { buildSceOrgUnitPreviewModel } from "@/lib/org/org-unit-preview-model";
import OrgUnitInspectorPanel, {
  type OrgUnitInspectorUnit,
} from "@/components/admin/org/OrgUnitInspectorPanel";
import OrgUnitCreateComposerDialog from "@/components/admin/org/OrgUnitCreateComposerDialog";
import OrgUnitCreateTrigger from "@/components/admin/org/OrgUnitCreateTrigger";
import { cn } from "@/lib/cn";

type OrgUnitListItem = OrgUnitCanvasItem;

type Props = {
  tenantId: string;
  orgUnits: OrgUnitListItem[];
  builderEnrichment: OrgUnitBuilderEnrichmentMap;
  roleKeyToName?: Record<string, string>;
  archivedOrgUnits: OrgUnitListItem[];
  showArchived: boolean;
  canManage: boolean;
  parentOptions: { id: string; key: string; name: string; level: number; type: string }[];
};

type ViewMode = "canvas" | "list";

export default function OrgUnitBuilderWorkspace({
  tenantId,
  orgUnits,
  builderEnrichment,
  roleKeyToName,
  archivedOrgUnits,
  showArchived,
  canManage,
  parentOptions,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorPeopleOpen, setInspectorPeopleOpen] = useState(false);
  const focusOrgUnitRef = useRef<(id: string) => void>(() => {});
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();

  function selectOrgUnit(id: string | null, options?: { openPeople?: boolean }) {
    setSelectedId(id);
    setInspectorPeopleOpen(Boolean(options?.openPeople));
  }

  const unitById = useMemo(() => new Map(orgUnits.map((u) => [u.id, u])), [orgUnits]);

  const inspectorUnit: OrgUnitInspectorUnit | null = useMemo(() => {
    if (!selectedId) return null;
    const unit = unitById.get(selectedId);
    if (!unit) return null;
    const parent = unit.parentId ? unitById.get(unit.parentId) : null;
    const childUnits = orgUnits
      .filter((u) => u.parentId === unit.id)
      .map((u) => ({ id: u.id, name: u.name, type: u.type }));

    const extra = builderEnrichment[unit.id];
    const resolveRoleName = roleKeyToName
      ? (roleKey: string) => roleKeyToName[roleKey] ?? null
      : undefined;

    const previewModel = buildSceOrgUnitPreviewModel({
      unit: {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        status: unit.status,
        description: unit.description,
        childCount: unit._count.children,
        teamCount: extra?.teamCount ?? 0,
        staffCount: extra?.staffCount ?? 0,
      },
      memberships: extra?.primaryMemberships ?? [],
      staffAssignments: extra?.staffAssignments ?? [],
      resolveRoleName,
    });

    const allStaff = deriveOrgUnitPeopleFromAssignments(
      extra?.staffAssignments ?? [],
      resolveRoleName,
    ).allPeople;

    return {
      id: unit.id,
      key: unit.key,
      name: unit.name,
      type: unit.type,
      status: unit.status,
      teamCount: extra?.teamCount ?? 0,
      staffCount: extra?.staffCount ?? 0,
      childCount: unit._count.children,
      hasChildren: unit._count.children > 0,
      collapsed: false,
      parentId: unit.parentId,
      parentName: parent?.name ?? null,
      description: unit.description,
      membershipCount: extra?.membershipCount ?? unit._count.memberships,
      childUnits,
      previewModel,
      allStaff,
    };
  }, [selectedId, unitById, orgUnits, builderEnrichment, roleKeyToName]);

  function openCreate(parentId?: string) {
    setCreateParentId(parentId);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4" data-testid="org-unit-builder-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
          role="tablist"
          aria-label="Organisation Builder Ansicht"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "canvas"}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]",
              view === "canvas"
                ? "bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text-1)]",
            )}
            onClick={() => setView("canvas")}
            data-testid="org-builder-view-canvas"
          >
            Organigramm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]",
              view === "list"
                ? "bg-[var(--surface-1)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text-1)]",
            )}
            onClick={() => setView("list")}
            data-testid="org-builder-view-list"
          >
            Liste
          </button>
        </div>

        {canManage ? (
          <OrgUnitCreateTrigger parentOptions={parentOptions} className="fca-button-primary inline-flex items-center gap-2" />
        ) : null}
      </div>

      {view === "canvas" ? (
        <div className="flex min-h-[min(70vh,640px)] flex-col gap-0 overflow-hidden rounded-xl border border-[var(--border)] lg:flex-row">
          <div className="min-h-0 min-w-0 flex-1">
            <OrgUnitCanvasView
              tenantId={tenantId}
              orgUnits={orgUnits}
              builderEnrichment={builderEnrichment}
              roleKeyToName={roleKeyToName}
              canManage={canManage}
              selectedId={selectedId}
              onSelectId={(id) => selectOrgUnit(id)}
              onViewAllStaff={(id) => selectOrgUnit(id, { openPeople: true })}
              onRegisterFocusHandler={(fn) => {
                focusOrgUnitRef.current = fn;
              }}
              onAddChild={(parentId) => openCreate(parentId)}
              onReparentSuccess={() => router.refresh()}
              parentOptions={parentOptions}
            />
          </div>
          {inspectorUnit ? (
            <OrgUnitInspectorPanel
              unit={inspectorUnit}
              canManage={canManage}
              hierarchyUnits={orgUnits.map((u) => ({ id: u.id, parentId: u.parentId }))}
              parentOptions={parentOptions}
              peopleViewOpen={inspectorPeopleOpen}
              onPeopleViewOpenChange={setInspectorPeopleOpen}
              onClose={() => selectOrgUnit(null)}
              onAddChild={(parentId) => openCreate(parentId)}
              onFocusChild={(childId) => {
                selectOrgUnit(childId);
                focusOrgUnitRef.current(childId);
              }}
            />
          ) : null}
        </div>
      ) : (
        <OrgUnitSearchableList
          orgUnits={orgUnits}
          archivedOrgUnits={archivedOrgUnits}
          showArchived={showArchived}
          canManage={canManage}
        />
      )}

      {canManage ? (
        <OrgUnitCreateComposerDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          parentOptions={parentOptions}
          defaultParentId={createParentId}
        />
      ) : null}
    </div>
  );
}
