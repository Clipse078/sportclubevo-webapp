"use client";

import Link from "next/link";
import type { AgendaErgebnisRow } from "@/lib/meetings/agenda-item-ergebnisse";

const KIND_LABEL: Record<AgendaErgebnisRow["kind"], string> = {
  BESCHLUSS: "Beschluss",
  PENDENZ: "Pendenz",
  AUFGABE: "Aufgabe",
};

type Props = {
  rows: AgendaErgebnisRow[];
  testIdPrefix: string;
};

export function MeetingTraktandumErgebnisseList({ rows, testIdPrefix }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-ergebnisse`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Ergebnisse</p>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={`${row.kind}-${row.id}`}
            className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border border-[var(--border)]/60 bg-[var(--surface-1)] px-2.5 py-2 text-sm"
            data-testid={`${testIdPrefix}-ergebnis-${row.kind}-${row.id}`}
          >
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {KIND_LABEL[row.kind]}
            </span>
            <Link href={row.href} className="min-w-0 font-medium text-[#0b4aa2] hover:underline break-words">
              {row.title}
            </Link>
            <span className="text-xs text-[var(--text-2)]">{row.statusLabel}</span>
            {row.meta ? <span className="w-full text-xs text-[var(--muted)]">{row.meta}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}