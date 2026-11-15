"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CD_NAV_COPY } from "@/lib/club-development/product-copy";
import {
  buildVorhabenUndUmsetzungHref,
  CD_WORKSPACE_PRIORITAETEN_QUERY,
} from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type Props = {
  prioritaetenActive: boolean;
};

export default function VorhabenPrioritaetenControl({ prioritaetenActive }: Props) {
  const searchParams = useSearchParams();

  const buildToggleHref = (enablePrioritaeten: boolean) => {
    const params: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      if (key === CD_WORKSPACE_PRIORITAETEN_QUERY) return;
      params[key] = value;
    });
    if (enablePrioritaeten) {
      params[CD_WORKSPACE_PRIORITAETEN_QUERY] = "1";
    }
    return buildVorhabenUndUmsetzungHref("vorhaben", params);
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5"
      data-testid="vorhaben-prioritaeten-control"
    >
      <p className="text-xs text-[var(--text-2)]">
        {prioritaetenActive
          ? "Prioritäten und Einordnung — Reihenfolge und Erwartetes Ergebnis."
          : "Vorhaben ausklappen, zugehörige Aufgaben und Fortschritt im Kartenbereich."}
      </p>
      <Link
        href={prioritaetenActive ? buildToggleHref(false) : buildToggleHref(true)}
        className="inline-flex shrink-0 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--sce-primary)]/40 hover:text-[var(--sce-primary)]"
        aria-current={prioritaetenActive ? "page" : undefined}
      >
        {prioritaetenActive ? "Zur Vorhaben-Ansicht" : CD_NAV_COPY.initiativeBacklog}
      </Link>
    </div>
  );
}