"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
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
import { UMSETZUNGSPLANUNG_SECTION_ACCENTS } from "@/lib/club-development/umsetzungsplanung-section-accent";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import UmsetzungsplanungUnplannedPanel from "./UmsetzungsplanungUnplannedPanel";
import { UmsetzungsplanungDragProvider } from "./UmsetzungsplanungDragContext";
import VereinsentwicklungWorkspaceToolbar from "./VereinsentwicklungWorkspaceToolbar";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "./sce-club-development-surface-styles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "./vereinsentwicklung-workspace-primary-button";

type Props = {
  sprints: UmsetzungsplanungPhaseCardItem[];
  canManageSprints: boolean;
  orgEinheitFilterLabel?: string | null;
  plannedSprintRanks?: Record<string, number>;
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
  plannedSprintRanks = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRef = useRef<DevelopmentSprintCreateCardHandle>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [pendingReorder, startReorder] = useTransition();

  const plannedRankMap = useMemo(() => new Map(Object.entries(plannedSprintRanks)), [plannedSprintRanks]);
  const phaseSearchActive = search.trim().length > 0;

  const filteredSprints = useMemo(
    () => filterPhasesBySearch(sprints, search),
    [search, sprints],
  );

  const buckets = partitionSprintsForUmsetzungsplanung(filteredSprints, plannedRankMap);
  const allPlannedIds = useMemo(
    () => partitionSprintsForUmsetzungsplanung(sprints, plannedRankMap).planned.map((p) => p.id),
    [plannedRankMap, sprints],
  );
  const [plannedOrderIds, setPlannedOrderIds] = useState<string[]>(allPlannedIds);

  useEffect(() => {
    setPlannedOrderIds(allPlannedIds);
  }, [allPlannedIds]);

  const plannedItems = useMemo(() => {
    const byId = new Map(buckets.planned.map((item) => [item.id, item] as const));
    if (phaseSearchActive) return buckets.planned;
    return plannedOrderIds.map((id) => byId.get(id)).filter((row): row is UmsetzungsplanungPhaseCardItem => Boolean(row));
  }, [buckets.planned, phaseSearchActive, plannedOrderIds]);

  const persistPlannedOrder = useCallback(
    async (orderedIds: string[]) => {
      if (phaseSearchActive) return { ok: false as const };
      setReorderError(null);
      setPlannedOrderIds(orderedIds);
      return new Promise<{ ok: boolean }>((resolve) => {
        startReorder(async () => {
          try {
            const res = await fetch("/api/club-development/umsetzungsplanung/planned-order", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderedSprintIds: orderedIds }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              const message =
                typeof data.error === "string"
                  ? data.error
                  : CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.plannedReorderFailed;
              setReorderError(message);
              setPlannedOrderIds(allPlannedIds);
              resolve({ ok: false });
              return;
            }
            router.refresh();
            resolve({ ok: true });
          } catch {
            setReorderError(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.plannedReorderFailed);
            setPlannedOrderIds(allPlannedIds);
            resolve({ ok: false });
          }
        });
      });
    },
    [allPlannedIds, phaseSearchActive, router],
  );
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

  const unplannedPrimary = canManageSprints && phaseOptions.length === 0;

  const unplannedPanel = canManageSprints ? (
    <UmsetzungsplanungUnplannedPanel
      phaseOptions={phaseOptions}
      assignDisabled={phaseOptions.length === 0}
      open={sectionOpen.unplanned}
      onOpenChange={(open) => touchSection("unplanned", open)}
      onAssigned={() => router.refresh()}
      searchQuery={search}
    />
  ) : null;

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

      <UmsetzungsplanungDragProvider canManagePlanning={canManageSprints}>
      <div className={`${SCE_CD_WORKSPACE_PANEL_CLASS} space-y-3`}>
        {canManageSprints && phaseOptions.length === 0 ? (
          <UmsetzungsplanungInlineEmpty
            message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noFuturePhases}
            testId="umsetzungsplanung-zero-phases-empty"
            action={
              <button
                type="button"
                className={VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS}
                onClick={() => {
                  touchSection("planned", true);
                  setCreateOpen(true);
                  createRef.current?.openForm();
                }}
                data-testid="umsetzungsplanung-zero-phases-create"
              >
                + Umsetzungsphase erstellen
              </button>
            }
          />
        ) : null}
        {canManageSprints ? (
          <DevelopmentSprintCreateCard
            ref={createRef}
            canCreate
            expanded={createOpen}
            onExpandedChange={setCreateOpen}
            hideHeader
          />
        ) : null}

        {unplannedPrimary ? unplannedPanel : null}

        <UmsetzungsplanungCollapsibleSection
          title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.ongoingSection}
          count={counts.ongoing}
          open={sectionOpen.ongoing}
          onOpenChange={(open) => touchSection("ongoing", open)}
          testId="umsetzungsplanung-ongoing-section"
          headerAccentClass={UMSETZUNGSPLANUNG_SECTION_ACCENTS.ongoing.headerClass}
          sectionBadge={
            <span className={UMSETZUNGSPLANUNG_SECTION_ACCENTS.ongoing.badgeClass} data-testid="umsetzungsplanung-ongoing-badge">
              Laufend
            </span>
          }
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
          headerAccentClass={UMSETZUNGSPLANUNG_SECTION_ACCENTS.planned.headerClass}
          sectionBadge={
            <span className={UMSETZUNGSPLANUNG_SECTION_ACCENTS.planned.badgeClass} data-testid="umsetzungsplanung-planned-badge">
              Geplant
            </span>
          }
        >
          {phaseSearchActive && canManageSprints ? (
            <p className="px-1 pb-2 text-xs text-[var(--muted)]">
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.plannedReorderFilteredHint}
            </p>
          ) : null}
          {reorderError ? (
            <div className="px-1 pb-2" data-testid="umsetzungsplanung-planned-reorder-error">
              <ClubDevelopmentFormError message={reorderError} />
            </div>
          ) : null}
          {counts.planned > 0 ? (
            <UmsetzungsplanungPhaseList
              items={plannedItems}
              canManageSprints={canManageSprints}
              phaseOptions={phaseOptions}
              plannedReorder={
                canManageSprints
                  ? {
                      enabled: !phaseSearchActive,
                      pending: pendingReorder,
                      orderedIds: plannedOrderIds,
                      onPersistOrder: persistPlannedOrder,
                    }
                  : undefined
              }
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

        {!unplannedPrimary ? unplannedPanel : null}

        <UmsetzungsplanungCollapsibleSection
          title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.completedSection}
          count={counts.completed}
          open={sectionOpen.completed}
          onOpenChange={(open) => touchSection("completed", open)}
          testId="umsetzungsplanung-completed-section"
          headerAccentClass={UMSETZUNGSPLANUNG_SECTION_ACCENTS.completed.headerClass}
          sectionBadge={
            <span
              className={UMSETZUNGSPLANUNG_SECTION_ACCENTS.completed.badgeClass}
              data-testid="umsetzungsplanung-completed-badge"
            >
              Abgeschlossen
            </span>
          }
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
      </UmsetzungsplanungDragProvider>
    </div>
  );
}