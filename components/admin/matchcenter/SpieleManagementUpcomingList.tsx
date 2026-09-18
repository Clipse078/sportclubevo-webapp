"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, SquareCheck, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MatchcenterRowViewModel } from "@/lib/matchcenter/view-model";
import {
  formatSpieleDayGroupHeadingLong,
  groupSpielplanungRowsByDay,
} from "@/lib/matchcenter/management-view";
import SpieleManagementMatchRow from "./SpieleManagementMatchRow";
import { cn } from "@/lib/cn";

type Props = {
  rows: MatchcenterRowViewModel[];
  locale: string;
  timezone: string;
  tenantLogoUrl?: string | null;
  canManage: boolean;
  compact?: boolean;
};

export default function SpieleManagementUpcomingList({
  rows,
  locale,
  timezone,
  tenantLogoUrl = null,
  canManage,
  compact = false,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dayGroups = groupSpielplanungRowsByDay(rows, locale, timezone);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(rows.map((row) => row.match.id)));
  }, [rows]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  async function applyBulkVisibility(wochenplanVisible: boolean) {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);

    try {
      const res = await fetch("/api/matchcenter/bulk-wochenplan-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds: ids, wochenplanVisible }),
      });
      const data = (await res.json().catch(() => null)) as
        | { updated?: number; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Wochenplan-Status konnte nicht aktualisiert werden.");
      }

      const count = data?.updated ?? ids.length;
      toast.success(
        `${count} ${count === 1 ? "Spiel" : "Spiele"} ${wochenplanVisible ? "im Wochenplan veröffentlicht" : "aus dem Wochenplan entfernt"}.`,
      );
      exitSelectionMode();
      startTransition(() => router.refresh());
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : "Wochenplan-Status konnte nicht aktualisiert werden.",
        { duration: 6000 },
      );
    }
  }

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount > 0 && selectedCount === rows.length;

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isSelecting ? (
            <>
              <button
                type="button"
                onClick={allSelected ? clearSelection : selectAll}
                data-testid="matchcenter-bulk-select-all"
                className="text-xs font-medium text-[var(--text-2)] underline-offset-2 hover:underline"
              >
                {allSelected ? "Alle abwählen" : "Alle auswählen"}
              </button>
              <span className="text-xs text-[var(--muted)]">{selectedCount} ausgewählt</span>
              <button
                type="button"
                onClick={exitSelectionMode}
                data-testid="matchcenter-bulk-exit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
              >
                <X className="h-3.5 w-3.5" />
                Auswahl beenden
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsSelecting(true)}
              data-testid="matchcenter-bulk-toggle"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
            >
              <SquareCheck className="h-3.5 w-3.5" />
              Wochenplan verwalten
            </button>
          )}
        </div>
      ) : null}

      {isSelecting && selectedCount > 0 ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3"
          data-testid="matchcenter-bulk-action-bar"
        >
          <span className="text-sm font-semibold" data-testid="matchcenter-bulk-count">
            {selectedCount} {selectedCount === 1 ? "Spiel ausgewählt" : "Spiele ausgewählt"}
          </span>
          <button
            type="button"
            onClick={() => applyBulkVisibility(true)}
            disabled={isPending}
            data-testid="matchcenter-bulk-enable"
            className="fca-button-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Im Wochenplan anzeigen
          </button>
          <button
            type="button"
            onClick={() => applyBulkVisibility(false)}
            disabled={isPending}
            data-testid="matchcenter-bulk-disable"
            className="fca-button-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Aus Wochenplan entfernen
          </button>
        </div>
      ) : null}

      <div className="space-y-3" data-testid="matchcenter-spielplanung-list">
        {dayGroups.map((group) => {
          const heading = formatSpieleDayGroupHeadingLong(
            group.rows[0]!.match.startAt,
            locale,
            timezone,
          );
          const count = group.rows.length;
          return (
            <section
              key={group.dayKey}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/90"
              data-testid={`spiele-day-group-${group.dayKey}`}
            >
              <header className="flex items-center justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--surface-2)]/30 px-4 py-2.5">
                <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--foreground)]">
                  {heading}
                </h3>
                <p
                  className="text-xs tabular-nums text-[var(--muted)]"
                  data-testid={`spiele-day-count-${group.dayKey}`}
                >
                  {count} {count === 1 ? "Spiel" : "Spiele"}
                </p>
              </header>
              <div>
                {group.rows.map((row) => (
                  <SpieleManagementMatchRow
                    key={row.match.id}
                    match={row.match}
                    assessment={row.assessment}
                    locale={locale}
                    timezone={timezone}
                    tenantLogoUrl={tenantLogoUrl}
                    canManage={canManage}
                    compact={compact}
                    isSelecting={isSelecting}
                    isSelected={selectedIds.has(row.match.id)}
                    onToggleSelect={toggleSelection}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
