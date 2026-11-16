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
  inline?: boolean;
};

export default function VorhabenPrioritaetenControl({ prioritaetenActive, inline = false }: Props) {
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

  const linkClass = inline
    ? "inline-flex shrink-0 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--sce-primary)]/40 hover:text-[var(--sce-primary)]"
    : "inline-flex shrink-0 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--sce-primary)]/40 hover:text-[var(--sce-primary)]";

  return (
    <Link
      href={prioritaetenActive ? buildToggleHref(false) : buildToggleHref(true)}
      className={linkClass}
      aria-current={prioritaetenActive ? "page" : undefined}
      data-testid="vorhaben-prioritaeten-control"
    >
      {prioritaetenActive ? "Alle Vorhaben" : CD_NAV_COPY.initiativeBacklog}
    </Link>
  );
}