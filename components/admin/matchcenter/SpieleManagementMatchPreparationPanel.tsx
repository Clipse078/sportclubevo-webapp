"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningMatchDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningMatchDressingRoomAssignments";
import { PlanningOperationalResourceGroup } from "@/components/admin/shared/planning/PlanningOperationalResourceGroup";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import {
  assessMatchOperationalState,
  isMatchOperationallyActionable,
} from "@/lib/matchcenter/operational-state";
import {
  buildHomeReadinessChecklist,
  resolveSpieleStatusPresentation,
} from "@/lib/matchcenter/management-view";
import { computeAllocationWarning } from "@/components/admin/matchcenter/MatchcenterDetailOperational";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import {
  facilityGroupsWithCodeAsId,
  resourceLabelFromCode,
} from "@/lib/matchcenter/facility-groups-for-match-pickers";
import { useMatchOperationalInlinePatch } from "@/lib/matchcenter/use-match-operational-inline-patch";
import { cn } from "@/lib/cn";
import { OperationalDensePanelShell } from "@/components/admin/shared/planning/OperationalDensePanelShell";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";

export type MatchPublicationVisibilityState = "ready" | "loading" | "unavailable";

export type SpieleManagementMatchPreparationPanelProps = {
  match: MatchcenterMatchSummary;
  assessment: MatchcenterOperationalAssessment;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  canManageOperationalAllocations: boolean;
  canManagePublication: boolean;
  /** When not ready, Infoboard control stays disabled and does not assume a default. */
  publicationVisibilityState?: MatchPublicationVisibilityState;
  onLiveMatchChange?: (match: MatchcenterMatchSummary) => void;
};

function stopAccordionToggle(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function PreparationPanelShell({
  children,
  openPointsLabel,
  isSaving,
}: {
  children: ReactNode;
  openPointsLabel: string | null;
  isSaving?: boolean;
}) {
  return (
    <OperationalDensePanelShell
      openPointsLabel={openPointsLabel}
      isSaving={isSaving}
      testId="matchcenter-open-points-panel"
      onPointerDown={stopAccordionToggle}
      onClick={stopAccordionToggle}
    >
      {children}
    </OperationalDensePanelShell>
  );
}

function SpieleManagementMatchPreparationReadOnly({
  match,
  assessment,
}: Pick<SpieleManagementMatchPreparationPanelProps, "match" | "assessment">) {
  const liveAssessment = useMemo(() => assessMatchOperationalState(match), [match]);
  const statusPresentation = resolveSpieleStatusPresentation(match, liveAssessment);
  const openPointsLabel = statusPresentation.label.includes("offen")
    ? statusPresentation.label
    : null;
  const readOnlyItems = buildHomeReadinessChecklist(match);
  const operationallyActionable = isMatchOperationallyActionable(match);

  return (
    <PreparationPanelShell openPointsLabel={openPointsLabel}>
      <ul className="mt-1.5 space-y-1.5" aria-label="Spielvorbereitung">
        {readOnlyItems.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-xs">
            {item.ready ? (
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full border border-amber-500/70"
                aria-hidden="true"
              />
            )}
            <span className="min-w-0 flex-1 leading-snug">
              <span className="text-[var(--muted)]">{item.label}</span>
              {item.ready && item.value ? (
                <span className="mt-0.5 block font-medium text-[var(--text-2)]">{item.value}</span>
              ) : null}
              {!item.ready ? (
                <span className="mt-0.5 block font-medium text-[var(--text-2)]">Offen</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {liveAssessment.teamUnresolved ? (
        <p className="mt-2 text-[0.6875rem] font-medium text-amber-600/90">Team nicht zugeordnet</p>
      ) : null}
      {!operationallyActionable ? (
        <p className="mt-2 text-[0.6875rem] text-[var(--muted)]">
          Historisches Spiel — Zuteilungen sind schreibgeschützt.
        </p>
      ) : null}
      <span className="sr-only" data-testid="matchcenter-preparation-assessment-status">
        {assessment.status}:{liveAssessment.status}
      </span>
    </PreparationPanelShell>
  );
}

function SpieleManagementMatchPreparationEditable({
  match,
  assessment,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  canManagePublication,
  publicationVisibilityState = "ready",
  onLiveMatchChange,
}: SpieleManagementMatchPreparationPanelProps) {
  const tResources = useTranslations("PlanningResources");
  const { patchField, isFieldPending, isSaving } = useMatchOperationalInlinePatch(match.id);
  const publicationReady = publicationVisibilityState === "ready";

  const [draft, setDraft] = useState(() => ({
    pitchCode: match.operational.pitchCode?.trim() ?? "",
    homeDressingRoomCode: match.operational.homeDressingRoomCode?.trim() ?? "",
    awayDressingRoomCode: match.operational.awayDressingRoomCode?.trim() ?? "",
    infoboardVisible: publicationReady ? match.visibility.infoboardVisible : false,
  }));

  useEffect(() => {
    if (!publicationReady || isSaving) return;
    setDraft((prev) => ({
      ...prev,
      pitchCode: match.operational.pitchCode?.trim() ?? "",
      homeDressingRoomCode: match.operational.homeDressingRoomCode?.trim() ?? "",
      awayDressingRoomCode: match.operational.awayDressingRoomCode?.trim() ?? "",
      infoboardVisible: match.visibility.infoboardVisible,
    }));
  }, [
    publicationReady,
    isSaving,
    match.id,
    match.operational.pitchCode,
    match.operational.homeDressingRoomCode,
    match.operational.awayDressingRoomCode,
    match.visibility.infoboardVisible,
  ]);

  const pitchGroupsByCode = useMemo(
    () => facilityGroupsWithCodeAsId(pitchHallFacilityGroups),
    [pitchHallFacilityGroups],
  );
  const dressingRoomGroupsByCode = useMemo(
    () => facilityGroupsWithCodeAsId(dressingRoomFacilityGroups),
    [dressingRoomFacilityGroups],
  );

  const matchEndIso = match.operationalEndAt?.toISOString() ?? match.endAt?.toISOString() ?? null;
  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: true,
    startAt: match.startAt.toISOString(),
    endAt: matchEndIso,
    excludeEventId: match.id,
    keyBy: "code",
  });

  const liveMatch = useMemo((): MatchcenterMatchSummary => {
    return {
      ...match,
      operational: {
        ...match.operational,
        pitchCode: draft.pitchCode.trim() || null,
        homeDressingRoomCode: draft.homeDressingRoomCode.trim() || null,
        awayDressingRoomCode: draft.awayDressingRoomCode.trim() || null,
      },
      visibility: {
        ...match.visibility,
        infoboardVisible: draft.infoboardVisible,
      },
    };
  }, [draft, match]);

  useEffect(() => {
    onLiveMatchChange?.(liveMatch);
  }, [liveMatch, onLiveMatchChange]);

  const liveAssessment = useMemo(
    () => assessMatchOperationalState(liveMatch),
    [liveMatch],
  );

  const statusPresentation = resolveSpieleStatusPresentation(liveMatch, liveAssessment);
  const openPointsLabel = statusPresentation.label.includes("offen")
    ? statusPresentation.label
    : null;

  const allocationWarning = computeAllocationWarning(
    match.homeAway,
    draft.infoboardVisible,
    draft.pitchCode,
    draft.homeDressingRoomCode,
    draft.awayDressingRoomCode,
  );

  const homeDisplayName = resolveMatchcenterCompactSideName(match.home);
  const awayDisplayName = resolveMatchcenterCompactSideName(match.away);

  const pitchResourceName = useMemo(
    () => (draft.pitchCode.trim() ? resourceLabelFromCode(pitchGroupsByCode, draft.pitchCode) : null),
    [draft.pitchCode, pitchGroupsByCode],
  );

  const canEditInfoboard =
    publicationReady && canManagePublication && isMatchOperationallyActionable(match);
  const infoboardStatusLabel =
    publicationVisibilityState === "loading"
      ? "Publikationsstatus wird geladen…"
      : publicationVisibilityState === "unavailable"
        ? "Publikationsstatus nicht verfügbar"
        : draft.infoboardVisible
          ? "Für Vereins-Infoboard freigegeben"
          : "Noch nicht für Infoboard freigegeben";

  const applyField = useCallback(
    async <K extends keyof typeof draft>(
      field: K,
      patchKey: "pitchCode" | "homeDressingRoomCode" | "awayDressingRoomCode" | "infoboardVisible",
      nextValue: (typeof draft)[K],
      previousValue: (typeof draft)[K],
    ) => {
      setDraft((prev) => ({ ...prev, [field]: nextValue }));
      const ok = await patchField(
        patchKey,
        typeof nextValue === "string" ? nextValue.trim() || null : nextValue,
      );
      if (!ok) {
        setDraft((prev) => ({ ...prev, [field]: previousValue }));
      }
    },
    [patchField],
  );

  return (
    <PreparationPanelShell openPointsLabel={openPointsLabel} isSaving={isSaving}>
      <div className="mt-2 space-y-3" data-testid={`matchcenter-inline-preparation-${match.id}`}>
        <PlanningOperationalResourceGroup testId={`matchcenter-inline-resources-${match.id}`}>
          <PlanningSingleResourceAssignment
            kind="pitch_hall"
            subjectLabel="Spielfeld"
            suppressKindIcon
            resourceName={pitchResourceName}
            unassignedLabel={tResources("unassignedPitchHall")}
            facilityGroups={pitchGroupsByCode}
            selectedResourceIds={draft.pitchCode ? new Set([draft.pitchCode]) : new Set()}
            onSelect={async (code) => {
              const previous = draft.pitchCode;
              await applyField("pitchCode", "pitchCode", code, previous);
            }}
            onDeselect={async () => {
              const previous = draft.pitchCode;
              await applyField("pitchCode", "pitchCode", "", previous);
            }}
            availabilityByResourceId={pitchAvailability}
            canManage
            disabled={isFieldPending("pitchCode")}
            testId={`matchcenter-inline-pitch-${match.id}`}
          />

          <PlanningMatchDressingRoomAssignments
            homeLabel="Heimkabine"
            awayLabel="Gastkabine"
            homeCode={draft.homeDressingRoomCode}
            awayCode={draft.awayDressingRoomCode}
            homeDisplayName={homeDisplayName}
            awayDisplayName={awayDisplayName}
            canManage
            embeddedInGroup
            disabled={
              isFieldPending("homeDressingRoomCode") || isFieldPending("awayDressingRoomCode")
            }
            facilityGroups={dressingRoomGroupsByCode}
            dressingRoomAvailability={dressingRoomAvailability}
            onSelectHome={async (code) => {
              const previous = draft.homeDressingRoomCode;
              await applyField("homeDressingRoomCode", "homeDressingRoomCode", code, previous);
            }}
            onSelectAway={async (code) => {
              const previous = draft.awayDressingRoomCode;
              await applyField("awayDressingRoomCode", "awayDressingRoomCode", code, previous);
            }}
            onDeselectHome={async () => {
              const previous = draft.homeDressingRoomCode;
              await applyField("homeDressingRoomCode", "homeDressingRoomCode", "", previous);
            }}
            onDeselectAway={async () => {
              const previous = draft.awayDressingRoomCode;
              await applyField("awayDressingRoomCode", "awayDressingRoomCode", "", previous);
            }}
            testId={`matchcenter-inline-dressing-${match.id}`}
          />
        </PlanningOperationalResourceGroup>

        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)]/70 bg-[var(--surface)]/80 px-3 py-2"
          data-testid={`matchcenter-inline-infoboard-${match.id}`}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">Infoboard</p>
            <p className="text-xs text-[var(--muted)]" data-testid={`matchcenter-inline-infoboard-status-${match.id}`}>
              {infoboardStatusLabel}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.infoboardVisible}
            aria-label="Auf Infoboard anzeigen"
            disabled={!canEditInfoboard || isFieldPending("infoboardVisible")}
            onClick={() =>
              void applyField(
                "infoboardVisible",
                "infoboardVisible",
                !draft.infoboardVisible,
                draft.infoboardVisible,
              )
            }
            data-testid={`matchcenter-inline-infoboard-toggle-${match.id}`}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0",
              draft.infoboardVisible ? "bg-emerald-500" : "bg-[var(--border-strong)]",
              !canEditInfoboard || isFieldPending("infoboardVisible")
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                draft.infoboardVisible ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        </div>

        {allocationWarning ? (
          <div
            className="flex items-start gap-2 rounded-lg border border-amber-300/80 bg-amber-500/10 px-3 py-2"
            data-testid={`matchcenter-inline-allocation-warning-${match.id}`}
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-xs text-amber-900">{allocationWarning}</p>
          </div>
        ) : null}
      </div>

      {liveAssessment.teamUnresolved ? (
        <p className="mt-2 text-[0.6875rem] font-medium text-amber-600/90">Team nicht zugeordnet</p>
      ) : null}

      <span className="sr-only" data-testid="matchcenter-preparation-assessment-status">
        {assessment.status}:{liveAssessment.status}
      </span>
    </PreparationPanelShell>
  );
}

export default function SpieleManagementMatchPreparationPanel(
  props: SpieleManagementMatchPreparationPanelProps,
) {
  const editable =
    props.canManageOperationalAllocations &&
    isMatchOperationallyActionable(props.match) &&
    props.pitchHallFacilityGroups.length > 0 &&
    props.dressingRoomFacilityGroups.length > 0;

  if (editable) {
    return <SpieleManagementMatchPreparationEditable {...props} />;
  }

  return (
    <SpieleManagementMatchPreparationReadOnly match={props.match} assessment={props.assessment} />
  );
}
