"use client";

import Link from "next/link";
import { CalendarDays, ChevronDown, MoreHorizontal, Plus, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  canCreate: boolean;
  createHref: string;
  wochenplanerHref: string;
};

export default function TurniereManagementHeaderMenu({
  canCreate,
  createHref,
  wochenplanerHref,
}: Props) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [overflowOpen]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreate ? (
        <Link
          href={createHref}
          className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
          data-testid="turniere-create-link"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Turnier erstellen
          <ChevronDown className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
        </Link>
      ) : null}
      <div ref={overflowRef} className="relative">
        <button
          type="button"
          onClick={() => setOverflowOpen((v) => !v)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)]",
            "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
          )}
          aria-label="Weitere Aktionen"
          aria-expanded={overflowOpen}
          data-testid="turniere-header-overflow"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {overflowOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-lg)]">
            <Link
              href={wochenplanerHref}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              data-testid="turniere-open-wochenplaner"
              onClick={() => setOverflowOpen(false)}
            >
              <CalendarDays className="h-4 w-4 text-[var(--muted)]" />
              Wochenplaner öffnen
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TurniereManagementPageTitle() {
  return (
    <h1 className="flex items-center gap-2 text-[1.625rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
      <Trophy className="h-7 w-7 text-[var(--sce-primary)]" aria-hidden="true" />
      Turniere
    </h1>
  );
}
