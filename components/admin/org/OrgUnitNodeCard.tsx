"use client";

import { ChevronDown, ChevronRight, GripVertical, Plus, Users } from "lucide-react";
import { OrgUnitTypeSceIcon } from "@/components/icons/OrgUnitTypeSceIcon";
import type { OrgContextualZoomLevel } from "@/lib/org/org-canvas-viewport";
import { cn } from "@/lib/cn";

export type OrgUnitCanvasNodeData = {
  id: string;
  name: string;
  type: string;
  status: string;
  memberCount: number;
  childCount: number;
  hasChildren: boolean;
  collapsed: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  CLUB: "Verein",
  DIVISION: "Abteilung",
  DEPARTMENT: "Ressort",
  SUB_DEPARTMENT: "Unterressort",
  TEAM: "Mannschaft",
  COMMITTEE: "Ausschuss",
  PROJECT_GROUP: "Projektgruppe",
  CUSTOM: "Benutzerdefiniert",
};

type Props = {
  unit: OrgUnitCanvasNodeData;
  selected: boolean;
  canManage: boolean;
  density?: OrgContextualZoomLevel;
  isDragging?: boolean;
  isReparentSource?: boolean;
  isReparentTarget?: boolean;
  isInvalidReparentTarget?: boolean;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onAddChild?: () => void;
  onReparentDragStart?: (e: React.DragEvent) => void;
  onReparentDragEnd?: () => void;
  tabIndex?: number;
};

export default function OrgUnitNodeCard({
  unit,
  selected,
  canManage,
  density = "NORMAL",
  isDragging = false,
  isReparentSource = false,
  isReparentTarget = false,
  isInvalidReparentTarget = false,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onReparentDragStart,
  onReparentDragEnd,
  tabIndex = 0,
}: Props) {
  const typeLabel = TYPE_LABELS[unit.type] ?? unit.type;
  const archived = unit.status === "ARCHIVED";
  const showMeta = density === "NORMAL";
  const showType = density !== "MICRO";

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      data-org-unit-node={unit.id}
      data-testid={`org-unit-node-${unit.id}`}
      data-org-node-density={density}
      className={cn(
        "group relative flex h-full w-full flex-col justify-center rounded-xl border px-3 py-2 text-left shadow-sm transition",
        "bg-[var(--surface-2)]/95 backdrop-blur-[2px]",
        "border-[var(--border)] hover:border-[var(--border-strong)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1220]",
        selected && "border-[var(--sce-accent)] ring-1 ring-[var(--sce-accent)]/45",
        isDragging && "cursor-grabbing opacity-90 shadow-md ring-2 ring-[var(--sce-accent)]/35",
        isReparentSource && "opacity-75",
        isReparentTarget &&
          !isInvalidReparentTarget &&
          "border-[var(--sce-accent)] ring-2 ring-[var(--sce-accent)]/55",
        isReparentTarget && isInvalidReparentTarget && "border-rose-500 ring-2 ring-rose-500/50",
        archived && "opacity-70",
      )}
      aria-pressed={selected}
      aria-label={`${unit.name}, ${typeLabel}`}
    >
      {canManage && onReparentDragStart ? (
        <div
          draggable
          onDragStart={onReparentDragStart}
          onDragEnd={onReparentDragEnd}
          data-org-reparent-handle={unit.id}
          data-testid={`org-unit-reparent-handle-${unit.id}`}
          className={cn(
            "absolute -left-1 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded p-0.5 text-[var(--muted)]",
            "opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100",
            "hover:bg-[var(--surface-3)] hover:text-[var(--sce-accent)]",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]",
          )}
          aria-label={`${unit.name} in der Hierarchie verschieben — auf Zieleinheit ziehen`}
          title="Hierarchie: auf Zieleinheit ziehen"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </div>
      ) : null}

      <div className="flex items-start gap-2">
        {unit.hasChildren && density !== "MICRO" ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
            aria-label={unit.collapsed ? "Zweig aufklappen" : "Zweig zuklappen"}
            aria-expanded={!unit.collapsed}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
          >
            {unit.collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
        )}

        {density !== "MICRO" ? (
          <OrgUnitTypeSceIcon type={unit.type} className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-primary)]" />
        ) : null}

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-semibold text-[var(--text-1)]",
              density === "MICRO" ? "text-[11px]" : "text-sm",
            )}
          >
            {unit.name}
          </p>
          {showType ? (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {typeLabel}
              {archived ? " · Archiviert" : unit.status === "INACTIVE" ? " · Inaktiv" : ""}
            </p>
          ) : null}
        </div>

        {canManage && onAddChild && density === "NORMAL" ? (
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-[var(--muted)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-[var(--sce-accent)]/15 hover:text-[var(--sce-accent)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)]"
            aria-label={`Untereinheit unter ${unit.name} erstellen`}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {showMeta ? (
        <div className="mt-1.5 flex items-center gap-3 pl-6 text-[10px] text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {unit.memberCount}
          </span>
          {unit.childCount > 0 ? (
            <span>
              {unit.childCount} Untereinheit{unit.childCount === 1 ? "" : "en"}
              {unit.collapsed ? " · zugeklappt" : ""}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
