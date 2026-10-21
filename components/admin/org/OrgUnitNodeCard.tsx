"use client";

import { ChevronDown, ChevronRight, Plus, Users } from "lucide-react";
import { OrgUnitTypeSceIcon } from "@/components/icons/OrgUnitTypeSceIcon";
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
  onSelect: () => void;
  onToggleCollapse: () => void;
  onAddChild?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  tabIndex?: number;
};

export default function OrgUnitNodeCard({
  unit,
  selected,
  canManage,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onDragStart,
  onDragEnd,
  tabIndex = 0,
}: Props) {
  const typeLabel = TYPE_LABELS[unit.type] ?? unit.type;
  const archived = unit.status === "ARCHIVED";

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      draggable={canManage && Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      data-org-unit-node={unit.id}
      data-testid={`org-unit-node-${unit.id}`}
      className={cn(
        "group relative flex h-full w-full flex-col justify-center rounded-xl border px-3 py-2 text-left shadow-sm transition",
        "bg-[var(--surface-2)]/90 backdrop-blur-sm",
        "border-[var(--border)] hover:border-[var(--border-strong)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
        selected && "border-[var(--sce-accent)] ring-1 ring-[var(--sce-accent)]/40",
        archived && "opacity-70",
      )}
      aria-pressed={selected}
      aria-label={`${unit.name}, ${typeLabel}`}
    >
      <div className="flex items-start gap-2">
        {unit.hasChildren ? (
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

        <OrgUnitTypeSceIcon type={unit.type} className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-primary)]" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-1)]">{unit.name}</p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {typeLabel}
            {archived ? " · Archiviert" : unit.status === "INACTIVE" ? " · Inaktiv" : ""}
          </p>
        </div>

        {canManage && onAddChild ? (
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

      <div className="mt-1.5 flex items-center gap-3 pl-6 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden />
          {unit.memberCount}
        </span>
        {unit.childCount > 0 ? (
          <span>
            {unit.childCount} Untereinheit{unit.childCount === 1 ? "" : "en"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
