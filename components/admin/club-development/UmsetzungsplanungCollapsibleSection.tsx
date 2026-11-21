"use client";

import { ChevronDown } from "lucide-react";
import type { DragEvent, ReactNode } from "react";
import { useState } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { cn } from "@/lib/cn";
import { useUmsetzungsplanungDragOptional } from "./UmsetzungsplanungDragContext";
import { useUmsetzungsplanungScheduleDropDwell } from "./useUmsetzungsplanungScheduleDropDwell";

type ScheduleDropHeaderProps = {
  acceptsDrop: boolean;
  hasEligiblePhases: boolean;
  onRequestOpen: () => void;
};

type Props = {
  title: string;
  count: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  children: ReactNode;
  headerAside?: ReactNode;
  headerAccentClass?: string;
  sectionBadge?: ReactNode;
  scheduleDropHeader?: ScheduleDropHeaderProps;
};

export default function UmsetzungsplanungCollapsibleSection({
  title,
  count,
  open,
  onOpenChange,
  testId,
  children,
  headerAside,
  headerAccentClass = "",
  sectionBadge = null,
  scheduleDropHeader,
}: Props) {
  const sectionId = `${testId}-body`;
  const dragCtx = useUmsetzungsplanungDragOptional();
  const [headerDropHover, setHeaderDropHover] = useState(false);
  const [headerDropBlocked, setHeaderDropBlocked] = useState(false);

  const unplannedDragActive =
    Boolean(dragCtx?.canManagePlanning) && dragCtx?.dragging?.source === "unplanned";

  const scheduleHeaderActive =
    unplannedDragActive && scheduleDropHeader && !open && headerDropHover;

  useUmsetzungsplanungScheduleDropDwell(
    Boolean(scheduleHeaderActive && scheduleDropHeader?.acceptsDrop),
    () => scheduleDropHeader?.onRequestOpen(),
  );

  const onHeaderDragOver = (event: DragEvent) => {
    if (!unplannedDragActive || !scheduleDropHeader) return;
    event.preventDefault();
    setHeaderDropHover(true);
    if (scheduleDropHeader.acceptsDrop) {
      setHeaderDropBlocked(false);
      event.dataTransfer.dropEffect = "move";
    } else {
      setHeaderDropBlocked(true);
      event.dataTransfer.dropEffect = "none";
    }
  };

  const onHeaderDragLeave = () => {
    setHeaderDropHover(false);
    setHeaderDropBlocked(false);
  };

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)]"
      data-testid={testId}
    >
      <div
        className={cn(
          `flex items-center gap-2 border-b border-[var(--border)]/70 bg-[var(--surface-2)]/60 px-3 py-2.5 ${headerAccentClass}`.trim(),
          headerDropHover &&
            unplannedDragActive &&
            scheduleDropHeader?.acceptsDrop &&
            "ring-2 ring-inset ring-[var(--sce-primary)]",
          headerDropBlocked && "ring-2 ring-inset ring-[var(--muted)]/40",
        )}
        onDragOver={onHeaderDragOver}
        onDragLeave={onHeaderDragLeave}
        data-testid={`${testId}-header-drop`}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
          aria-expanded={open}
          aria-controls={sectionId}
          onClick={() => onOpenChange(!open)}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
          <span className="min-w-0 truncate">{title}</span>
          {sectionBadge}
          <span className="text-xs font-normal text-[var(--muted)]" data-testid={`${testId}-count`}>
            ({count ?? "—"})
          </span>
        </button>
        {headerAside}
      </div>
      {headerDropBlocked && headerDropHover ? (
        <p className="border-b border-[var(--border)]/50 px-3 py-1.5 text-xs text-[var(--muted)]" role="status">
          {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.scheduleSectionNoDestinations}
        </p>
      ) : null}
      {open ? (
        <div id={sectionId} className="space-y-3 overflow-visible p-3 pt-2">
          {children}
        </div>
      ) : null}
    </section>
  );
}