"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PopoverContent } from "@/components/ui/Popover";
import PlanningHubVisibleTimeRangeControl from "./PlanningHubVisibleTimeRangeControl";

type PlanningHubPlannerViewOptionsProps = {
  className?: string;
};

export default function PlanningHubPlannerViewOptions({ className }: PlanningHubPlannerViewOptionsProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={cn(
          "rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]",
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="planning-hub-view-options-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        Ansicht
      </button>
      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        role="dialog"
        aria-label="Planungsansicht"
        matchAnchorWidth={false}
        maxHeight={360}
        className="w-[min(20rem,calc(100vw-2rem))] p-3"
      >
        <PlanningHubVisibleTimeRangeControl embedded />
      </PopoverContent>
    </>
  );
}
