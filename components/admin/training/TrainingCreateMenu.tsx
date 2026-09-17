"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { PopoverContent } from "@/components/ui/Popover";

type Props = {
  canCreate: boolean;
};

/**
 * Canonical create entry — standalone TrainingSession creation is not supported
 * without a parent TrainingSeries (trainingSeriesId is required in schema).
 */
export default function TrainingCreateMenu({ canCreate }: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  if (!canCreate) return null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        data-testid="training-create-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus className="h-3.5 w-3.5" />
        Training erstellen
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      </button>
      <PopoverContent open={open} onOpenChange={setOpen} anchorRef={anchorRef} matchAnchorWidth={false}>
        <div className="min-w-48 py-1" role="menu">
          <Link
            href="/dashboard/training/new"
            role="menuitem"
            className="block px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            data-testid="training-create-series"
            onClick={() => setOpen(false)}
          >
            Trainingsserie
          </Link>
        </div>
      </PopoverContent>
    </>
  );
}
