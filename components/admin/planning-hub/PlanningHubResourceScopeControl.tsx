"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  buildPlanningHubHref,
  type PlanningHubUrlState,
} from "@/lib/planning-hub/planner-url";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import {
  buildPlanningResourceGroupsFromFacilityGroups,
  formatPlanningResourceScopeSummary,
  resourceIdsMatchGroup,
  resourceIdsMatchSegment,
  shouldUseCompactResourceScopeSelector,
} from "@/lib/planning-hub/resource-timeline/planning-resource-groups";
import { PopoverContent } from "@/components/ui/Popover";

type PlanningHubResourceScopeControlProps = {
  urlState: PlanningHubUrlState;
  facilityGroups: FacilityGroup[];
  perspectiveLabel: "Spielfelder" | "Garderoben";
};

export default function PlanningHubResourceScopeControl({
  urlState,
  facilityGroups,
  perspectiveLabel,
}: PlanningHubResourceScopeControlProps) {
  const category = urlState.resourceCategory === "dressing" ? "dressing" : "pitch";
  const groups = useMemo(
    () => buildPlanningResourceGroupsFromFacilityGroups(facilityGroups, category),
    [facilityGroups, category],
  );
  const activeIds = urlState.resourceFilterIds;
  const allActive = !activeIds?.length;
  const compactOnly = shouldUseCompactResourceScopeSelector(groups, category);
  const summary = formatPlanningResourceScopeSummary({
    groups,
    activeIds: activeIds ?? null,
    perspectiveLabel,
  });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLButtonElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups.filter((g) => {
      const hay = `${g.label} ${g.facilityName} ${g.segments.map((s) => s.segmentLabel).join(" ")}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [groups, normalizedQuery]);

  if (groups.length === 0) return null;

  const scopeLinks = (
    <>
      <Link
        href={buildPlanningHubHref(urlState, { resourceFilterIds: null })}
        className={cn(
          "block rounded-md px-2 py-1.5 text-xs font-semibold",
          allActive
            ? "bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
            : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
        )}
        data-testid="planning-hub-resource-scope-all"
        onClick={() => setOpen(false)}
      >
        {perspectiveLabel === "Garderoben" ? "Alle Garderoben" : "Alle Spielfelder"}
      </Link>
      {filteredGroups.map((group) => {
        const groupSelected = resourceIdsMatchGroup(activeIds, group);
        const hasSegments = group.segments.length > 1;
        return (
          <div key={group.groupKey} className="space-y-0.5">
            <Link
              href={buildPlanningHubHref(urlState, { resourceFilterIds: group.allResourceIds })}
              className={cn(
                "block rounded-md px-2 py-1.5 text-xs font-semibold",
                groupSelected
                  ? "bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
              )}
              data-testid={`planning-hub-resource-scope-group-${group.groupKey}`}
              onClick={() => setOpen(false)}
            >
              {group.label}
            </Link>
            {hasSegments ? (
              <ul className="ml-3 space-y-0.5 border-l border-[var(--border)]/60 pl-2">
                {group.segments.map((segment) => {
                  const selected = resourceIdsMatchSegment(activeIds, segment.resourceId);
                  return (
                    <li key={segment.resourceId}>
                      <Link
                        href={buildPlanningHubHref(urlState, { resourceFilterIds: [segment.resourceId] })}
                        className={cn(
                          "block rounded-md px-2 py-1 text-[11px] font-medium",
                          selected
                            ? "bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                            : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                        )}
                        data-testid={`planning-hub-resource-scope-${segment.resourceId}`}
                        onClick={() => setOpen(false)}
                      >
                        {segment.segmentLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </>
  );

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
      data-testid="planning-hub-resource-scope"
      data-planning-resource-scope-mode={compactOnly ? "compact" : "chips"}
    >
      {!compactOnly ? (
        <div className="inline-flex max-w-full flex-wrap gap-1">
          <Link
            href={buildPlanningHubHref(urlState, { resourceFilterIds: null })}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-semibold",
              allActive
                ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
            )}
            data-testid="planning-hub-resource-scope-all"
          >
            Alle
          </Link>
          {groups.map((group) => {
            const selected = resourceIdsMatchGroup(activeIds, group);
            return (
              <Link
                key={group.groupKey}
                href={buildPlanningHubHref(urlState, { resourceFilterIds: group.allResourceIds })}
                className={cn(
                  "max-w-[10rem] truncate rounded-md border px-2 py-1 text-xs font-semibold",
                  selected
                    ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                    : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                )}
                title={group.label}
                data-testid={`planning-hub-resource-scope-group-${group.groupKey}`}
              >
                {group.label}
              </Link>
            );
          })}
        </div>
      ) : (
        <>
          <button
            ref={anchorRef}
            type="button"
            className="inline-flex max-w-[14rem] items-center gap-1 truncate rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            aria-haspopup="listbox"
            aria-expanded={open}
            data-testid="planning-hub-resource-scope-trigger"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="truncate">{summary}</span>
            <span className="text-[10px] text-[var(--muted)]" aria-hidden>
              ▾
            </span>
          </button>
          <PopoverContent
            open={open}
            onOpenChange={setOpen}
            anchorRef={anchorRef}
            role="listbox"
            aria-label={`${perspectiveLabel} auswählen`}
            matchAnchorWidth={false}
            maxHeight={320}
            className="min-w-[16rem] p-2"
          >
            {groups.length > 8 ? (
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Suchen…"
                className="mb-2 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                data-testid="planning-hub-resource-scope-search"
              />
            ) : null}
            <div className="max-h-64 space-y-1 overflow-auto">{scopeLinks}</div>
          </PopoverContent>
        </>
      )}
    </div>
  );
}
