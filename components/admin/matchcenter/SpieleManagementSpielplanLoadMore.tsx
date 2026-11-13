"use client";

import { useCallback, useState, useTransition } from "react";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { SpielplanungPaginationState } from "@/lib/matchcenter/spielplan-schedule-scope";
import { mergeMatchcenterMatchesById } from "@/lib/matchcenter/spielplan-schedule-scope";

type Props = {
  matches: MatchcenterMatchSummary[];
  pagination: SpielplanungPaginationState;
  scopeFrom?: string | null;
  scopeTo?: string | null;
  onAppend: (merged: MatchcenterMatchSummary[]) => void;
};

type PageResponse = {
  items: Array<Omit<MatchcenterMatchSummary, "startAt" | "endAt"> & {
    startAt: string;
    endAt: string | null;
  }>;
  meta: {
    total: number;
    hasMore: boolean;
    skip: number;
    limit: number;
  };
};

function reviveMatches(
  items: PageResponse["items"],
): MatchcenterMatchSummary[] {
  return items.map((item) => ({
    ...item,
    startAt: new Date(item.startAt),
    endAt: item.endAt ? new Date(item.endAt) : null,
  })) as MatchcenterMatchSummary[];
}

export default function SpieleManagementSpielplanLoadMore({
  matches,
  pagination,
  scopeFrom,
  scopeTo,
  onAppend,
}: Props) {
  const [pageState, setPageState] = useState(pagination);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchNextPage = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const params = new URLSearchParams();
      params.set("skip", String(matches.length));
      if (scopeFrom?.trim()) {
        params.set("scopeFrom", scopeFrom.trim());
      }
      if (scopeTo?.trim()) {
        params.set("scopeTo", scopeTo.trim());
      }

      const response = await fetch(
        `/api/matchcenter/spielplanung/matches?${params.toString()}`,
      );

      if (!response.ok) {
        setError("Weitere Spiele konnten nicht geladen werden.");
        return;
      }

      const body = (await response.json()) as PageResponse;
      const nextItems = reviveMatches(body.items);
      const merged = mergeMatchcenterMatchesById(matches, nextItems);

      setPageState({
        total: body.meta.total,
        hasMore: body.meta.hasMore,
        loadedCount: merged.length,
        limit: body.meta.limit,
      });
      onAppend(merged);
    });
  }, [matches, onAppend, scopeFrom, scopeTo]);

  if (!pageState.hasMore) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2" data-testid="matchcenter-spielplan-load-more">
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <button
        type="button"
        className="fca-button-secondary text-sm"
        disabled={pending}
        onClick={fetchNextPage}
        data-testid="matchcenter-spielplan-load-more-button"
      >
        {pending
          ? "Lade weitere Spiele…"
          : `Weitere Spiele laden (${matches.length} von ${pageState.total})`}
      </button>
    </div>
  );
}
