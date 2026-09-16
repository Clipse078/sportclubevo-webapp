"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type PlanningHubCreatePermissions = {
  training: boolean;
  match: boolean;
  tournament: boolean;
  veranstaltung: boolean;
};

type PlanningHubCreateMenuProps = {
  permissions: PlanningHubCreatePermissions;
};

const CREATE_LINKS: Array<{
  key: keyof PlanningHubCreatePermissions;
  label: string;
  href: string;
}> = [
  { key: "training", label: "Training", href: "/dashboard/training/new" },
  { key: "match", label: "Spiel", href: "/dashboard/matchcenter/new" },
  { key: "tournament", label: "Turnier", href: "/dashboard/tournamentcenter/new" },
  { key: "veranstaltung", label: "Veranstaltung", href: "/dashboard/veranstaltungen/new" },
];

export default function PlanningHubCreateMenu({ permissions }: PlanningHubCreateMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const allowed = CREATE_LINKS.filter((entry) => permissions[entry.key]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (allowed.length === 0) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        data-testid="planning-hub-create"
      >
        <Plus className="h-3.5 w-3.5" />
        Erstellen
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
          data-testid="planning-hub-create-menu"
        >
          {allowed.map((entry) => (
            <Link
              key={entry.key}
              href={entry.href}
              className="block px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              onClick={() => setOpen(false)}
            >
              {entry.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
