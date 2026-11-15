"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import VorhabenCollapsibleCard from "./VorhabenCollapsibleCard";
import type { VorhabenWorkspaceCardSummary } from "@/lib/club-development/vorhaben-workspace-card-types";
import { CD_WORKSPACE_VORHABEN_EXPAND_QUERY } from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type Props = {
  items: VorhabenWorkspaceCardSummary[];
  showBacklogMeta?: boolean;
  testId?: string;
};

export default function VorhabenWorkspaceCardList({
  items,
  showBacklogMeta = false,
  testId = "vorhaben-workspace-card-list",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const expandedId = searchParams.get(CD_WORKSPACE_VORHABEN_EXPAND_QUERY)?.trim() ?? "";

  const setExpandedId = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id) {
        next.set(CD_WORKSPACE_VORHABEN_EXPAND_QUERY, id);
      } else {
        next.delete(CD_WORKSPACE_VORHABEN_EXPAND_QUERY);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const expandedSet = useMemo(() => new Set(expandedId ? [expandedId] : []), [expandedId]);

  return (
    <div className="space-y-3" data-testid={testId}>
      {items.map((summary) => {
        const expanded = expandedSet.has(summary.id);
        return (
          <VorhabenCollapsibleCard
            key={summary.id}
            summary={summary}
            expanded={expanded}
            showBacklogMeta={showBacklogMeta}
            onExpandedChange={(next) => setExpandedId(next ? summary.id : null)}
          />
        );
      })}
    </div>
  );
}