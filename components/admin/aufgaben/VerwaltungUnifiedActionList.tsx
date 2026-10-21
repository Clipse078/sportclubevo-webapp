import Link from "next/link";
import type { VerwaltungUnifiedRow } from "@/lib/aufgaben/verwaltung-unified-presentation";
import { cn } from "@/lib/cn";
import { SceDenseMetaChip } from "@/components/sce/dense/SceDenseMetaChip";

type Props = {
  rows: VerwaltungUnifiedRow[];
  loadError?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

function typeChip(row: VerwaltungUnifiedRow) {
  if (row.kind === "AUFGABE") {
    return (
      <SceDenseMetaChip
        label="Aufgabe"
        className={cn(
          "border-[var(--sce-warning)]/35 bg-[var(--sce-warning)]/10 text-[var(--sce-warning)]",
        )}
        testId={`verwaltung-row-type-aufgabe-${row.id}`}
      />
    );
  }
  return (
    <SceDenseMetaChip
      label="Anforderung"
      className={cn(
        "border-[var(--sce-success)]/30 bg-[var(--sce-success)]/10 text-[var(--sce-success)]",
      )}
      testId={`verwaltung-row-type-anforderung-${row.id}`}
    />
  );
}

export default function VerwaltungUnifiedActionList({
  rows,
  loadError = false,
  emptyTitle = "Noch keine Aufgaben oder Anforderungen.",
  emptyDescription = "Lege eine Aufgabe an oder starte eine Anforderung, um Bestätigungen einzuholen.",
}: Props) {
  if (loadError) return null;

  if (rows.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center"
        data-testid="verwaltung-unified-empty"
      >
        <p className="text-sm font-medium text-[var(--foreground)]">{emptyTitle}</p>
        <p className="mt-1 text-sm text-[var(--text-2)]">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]"
      data-testid="verwaltung-unified-list"
    >
      <ul className="divide-y divide-[var(--border)]/70">
        {rows.map((row) => (
          <li key={`${row.kind}-${row.id}`} className="px-3 py-2.5 hover:bg-[var(--surface-2)]/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {typeChip(row)}
                  <Link
                    href={row.href}
                    className="truncate font-medium text-[var(--foreground)] hover:text-[var(--link)]"
                    data-testid={`verwaltung-unified-row-${row.kind.toLowerCase()}-${row.id}`}
                  >
                    {row.title}
                  </Link>
                </div>
                <p className="text-xs text-[var(--text-2)]">
                  <span className="text-[var(--muted)]">{row.statusLabel}</span>
                  {row.metaPrimary ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {row.metaPrimary}
                    </>
                  ) : null}
                  {row.metaSecondary ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      {row.metaSecondary}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
