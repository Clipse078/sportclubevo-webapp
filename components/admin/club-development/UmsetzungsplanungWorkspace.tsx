"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import DevelopmentSprintCreateCard, {
  type DevelopmentSprintCreateCardHandle,
} from "./DevelopmentSprintCreateCard";
import {
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import {
  applyUmsetzungsplanungSectionDeepLink,
  countUmsetzungsplanungBuckets,
  openPhaseAssignmentOptions,
  parseUmsetzungsplanungSectionFocus,
  partitionSprintsForUmsetzungsplanung,
  resolveUmsetzungsplanungSectionOpenDefaults,
  type UmsetzungsplanungSectionKey,
} from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { CD_UMSETZUNGSPLANUNG_SECTION_QUERY } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { UmsetzungsplanungPhaseCardItem } from "./UmsetzungsplanungPhaseCard";
import { UmsetzungsplanungPhaseList } from "./UmsetzungsplanungPhaseCard";
import UmsetzungsplanungCollapsibleSection from "./UmsetzungsplanungCollapsibleSection";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import UmsetzungsplanungUnplannedPanel from "./UmsetzungsplanungUnplannedPanel";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";

type Props = {
  sprints: UmsetzungsplanungPhaseCardItem[];
  canManageSprints: boolean;
  orgEinheitFilterLabel?: string | null;
};

function filterPhasesBySearch(items: UmsetzungsplanungPhaseCardItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.title.toLowerCase().includes(q));
}

export default function UmsetzungsplanungWorkspace({
  sprints,
  canManageSprints,
  orgEinheitFilterLabel = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRef = useRef<DevelopmentSprintCreateCardHandle>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredSprints = useMemo(
    () => filterPhasesBySearch(sprints, search),
    [search, sprints],
  );

  const buckets = partitionSprintsForUmsetzungsplanung(filteredSprints);
  const counts = countUmsetzungsplanungBuckets(buckets);
  const phaseOptions = openPhaseAssignmentOptions(buckets);
  const sectionFocus = parseUmsetzungsplanungSectionFocus(searchParams.get(CD_UMSETZUNGSPLANUNG_SECTION_QUERY));
  const [sectionOpen, setSectionOpen] = useState(() =>
    applyUmsetzungsplanungSectionDeepLink(
      resolveUmsetzungsplanungSectionOpenDefaults(counts, canManageSprints),
      sectionFocus,
    ),
  );
  const touchSection = (key: UmsetzungsplanungSectionKey, open: boolean) => {
    setSectionOpen((prev) => ({ ...prev, [key]: open }));
  };

  const primaryAction = canManageSprints ? (
    <button
      type="button"
      className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
      onClick={() => {
        setCreateOpen(true);
        createRef.current?.openForm();
      }}
      data-testid="umsetzungsplanung-toolbar-create"
    >
      + Umsetzungsphase erstellen
    </button>
  ) : null;

  const searchControl = (
    <label className="relative block min-w-[min(100%,16rem)] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Umsetzungsphasen oder Aufgaben suchen …"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
        data-testid="umsetzungsplanung-search"
      />
    </label>
  );

  return (
    <div className="space-y-4" data-testid="umsetzungsplanung-workspace">
      <VereinsentwicklungWorkspaceToolbar
        orgEinheitFilterLabel={orgEinheitFilterLabel}
        filters={searchControl}
        primaryAction={primaryAction}
        testId="umsetzungsplanung-workspace-toolbar"
      />

      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`}>
        {canManageSprints ? (
          <DevelopmentSprintCreateCard
            ref={createRef}
            canCreate
            expanded={createOpen}
            onExpandedChange={setCreateOpen}
            hideHeader
          />
        ) : null}

        <UmsetzungsplanungCollapsibleSection
          title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.ongoingSection}
          count={counts.ongoing}
          open={sectionOpen.ongoing}
          onOpenChange={(open) => touchSection("ongoing", open)}
          testId="umsetzungsplanung-ongoing-section"
        >
          {counts.ongoing > 0 ? (
            <UmsetzungsplanungPhaseList
              items={buckets.active}
              canManageSprints={canManageSprints}
              phaseOptions={phaseOptions}
            />
          ) : (
            <UmsetzungsplanungInlineEmpty
              message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noActivePhase}
              testId="umsetzungsplanung-ongoing-empty"
            />
          )}
        </UmsetzungsplanungCollapsibleSection>

        <UmsetzungsplanungCollapsibleSection
          title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.futureSection}
          count={counts.planned}
          open={sectionOpen.planned}
          onOpenChange={(open) => touchSection("planned", open)}
          testId="umsetzungsplanung-future-section"
        >
          {counts.planned > 0 ? (
            <UmsetzungsplanungPhaseList
              items={buckets.planned}
              canManageSprints={canManageSprints}
              phaseOptions={phaseOptions}
            />
          ) : (
            <UmsetzungsplanungInlineEmpty
              message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noFuturePhases}
              testId="umsetzungsplanung-future-empty"
              action={
                canManageSprints ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                    onClick={() => {
                      touchSection("planned", true);
                      setCreateOpen(true);
                      createRef.current?.openForm();
                    }}
                  >
                    {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.createPhaseAction}
                  </button>
                ) : null
              }
            />
          )}
        </UmsetzungsplanungCollapsibleSection>

        {canManageSprints ? (
          <UmsetzungsplanungUnplannedPanel
            phaseOptions={phaseOptions}
            disabled={phaseOptions.length === 0}
            open={sectionOpen.unplanned}
            onOpenChange={(open) => touchSection("unplanned", open)}
            onAssigned={() => router.refresh()}
            searchQuery={search}
          />
        ) : null}

        <UmsetzungsplanungCollapsibleSection
          title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.completedSection}
          count={counts.completed}
          open={sectionOpen.completed}
          onOpenChange={(open) => touchSection("completed", open)}
          testId="umsetzungsplanung-completed-section"
        >
          {counts.completed > 0 ? (
            <UmsetzungsplanungPhaseList
              items={buckets.completed}
              canManageSprints={canManageSprints}
              phaseOptions={phaseOptions}
              readOnlyTasks
            />
          ) : (
            <UmsetzungsplanungInlineEmpty
              message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noCompletedPhases}
              testId="umsetzungsplanung-completed-empty"
            />
          )}
        </UmsetzungsplanungCollapsibleSection>
      </div>
    </div>
  );
}