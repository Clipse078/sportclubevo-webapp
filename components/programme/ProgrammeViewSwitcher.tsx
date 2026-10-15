"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ProgrammeUrlState } from "@/lib/programme-engine/programme-url";
import { buildProgrammeHref } from "@/lib/programme-engine/programme-url";

type Props = {
  basePath: string;
  urlState: ProgrammeUrlState;
};

export default function ProgrammeViewSwitcher({ basePath, urlState }: Props) {
  const listeHref = buildProgrammeHref(basePath, urlState, { view: "liste" });
  const kalenderHref = buildProgrammeHref(basePath, urlState, { view: "kalender" });

  return (
    <div
      role="tablist"
      aria-label="Programm Ansicht"
      className="inline-flex rounded-lg border border-[var(--border)] p-0.5"
      data-testid="programme-view-switcher"
    >
      <Link
        href={listeHref}
        role="tab"
        aria-selected={urlState.view === "liste"}
        data-testid="programme-view-liste"
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
          urlState.view === "liste"
            ? "bg-[var(--sce-primary)] text-white"
            : "text-[var(--text-2)] hover:text-[var(--foreground)]",
        )}
      >
        Liste
      </Link>
      <Link
        href={kalenderHref}
        role="tab"
        aria-selected={urlState.view === "kalender"}
        data-testid="programme-view-kalender"
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
          urlState.view === "kalender"
            ? "bg-[var(--sce-primary)] text-white"
            : "text-[var(--text-2)] hover:text-[var(--foreground)]",
        )}
      >
        Kalender
      </Link>
    </div>
  );
}
