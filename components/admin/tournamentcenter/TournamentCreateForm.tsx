"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SceActivityComposer from "@/components/sce/activity-composer/SceActivityComposer";
import type { SceActivityCreateDefinition } from "@/lib/sce/activity-composer/types";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { SceActivityCreateSuccessResult } from "@/lib/sce/activity-composer/success-result";
import type { TournamentComposerDraftPayload } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { resolveTournamentComposerTitleForResume } from "@/lib/tournaments/composer/tournament-composer-draft-access";
import { hydrateTournamentComposerFormFromDraft } from "@/lib/tournaments/composer/hydrate-tournament-composer-form-from-draft";
import type { SceActivityCreateResumeDraft } from "@/lib/sce/activity-composer/draft-persistence-capability";
import {
  buildTournamentCreateTabNavigationConfig,
  type TournamentCreateTabId,
} from "@/lib/tournaments/tournament-create-workflow-config";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningResourceAssignmentKindIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { PlanningSubjectDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningSubjectDressingRoomAssignments";
import type { SceActivityCreateOriginContext } from "@/lib/sce/activity-composer/origin-context";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS, PLANNING_RESOURCE_SECTION_LABEL_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import TournamentPublicationToggles from "@/components/admin/tournamentcenter/TournamentPublicationToggles";
import TournamentOrganizerClubField from "@/components/admin/tournamentcenter/TournamentOrganizerClubField";
import TournamentOwnTeamsSection from "@/components/admin/tournamentcenter/TournamentOwnTeamsSection";
import TournamentExternalClubsSection from "@/components/admin/tournamentcenter/TournamentExternalClubsSection";
import TournamentManualParticipantSection from "@/components/admin/tournamentcenter/TournamentManualParticipantSection";
import {
  resolveEffectiveOrganiserSelection,
  sanitizeOrganiserDraftFields,
} from "@/lib/tournaments/composer/tournament-composer-organiser";
import TournamentCreateReviewPanel from "@/components/admin/tournamentcenter/TournamentCreateReviewPanel";
import {
  buildTournamentLobbyParticipantIdentities,
  buildTournamentResourceDressingRoomSubjectPresentations,
  isDuplicateTournamentParticipant,
} from "@/lib/tournaments/tournament-participant-presentation";
import { SceTournamentResourceParticipantCrest } from "@/components/sce/tournament/SceTournamentResourceParticipantCrest";
import type { ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";
import { HomeAwaySegmentedControl } from "@/components/admin/shared/HomeAwaySegmentedControl";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { resolveTournamentPublicationDefaultsForCreate } from "@/lib/publishing/policy/tournament-publication-defaults";
import {
  computeTournamentCreateTabErrors,
  firstInvalidTournamentCreateTab,
} from "@/lib/tournaments/tournament-create-validation";
import type { TournamentTeamOption } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import type { TournamentSeasonOption } from "@/lib/tournaments/composer/load-tournament-composer-create-surface-props.server";
import {
  resolveTournamentCreateStepValid,
  validateTournamentCreateWorkflowStep,
} from "@/lib/tournaments/tournament-create-step-validation";
import { SceActivityDateTimeInput } from "@/components/sce/activity-datetime/SceActivityDateTimeInput";
import type { TournamentParticipantDraftKind } from "@/lib/tournaments/create-tournament-orchestration";
import {
  createDefaultTournamentComposerPlannerDraft,
} from "@/lib/tournaments/composer/tournament-composer-planner-defaults";
import type { TournamentComposerPlannerDraft } from "@/lib/tournaments/composer/tournament-composer-planner-types";
import {
  TournamentComposerSpielplanPanel,
  TournamentComposerSpielfelderPanel,
  TournamentComposerTurnierformatPanel,
} from "@/components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels";
import TournamentComposerPlayingUnitsPanel from "@/components/admin/tournamentcenter/composer/TournamentComposerPlayingUnitsPanel";
import {
  countComposerCuratedTemplateParticipants,
  reconcileComposerPlannerForParticipants,
} from "@/lib/tournaments/composer/tournament-composer-programme-template";
import {
  addComposerPlayingUnitSubunit,
  removeComposerPlayingUnit,
  splitComposerParticipantIntoDefaultSubunits,
  updateComposerPlayingUnitName,
} from "@/lib/tournaments/composer/tournament-composer-playing-units";

type Props = {
  activeSeasonId: string;
  seasonOptions: TournamentSeasonOption[];
  teamOptions: TournamentTeamOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  defaultTournamentDurationMinutes?: number;
  canManageFacilitiesTimeStandards?: boolean;
  tenantClubName: string;
  tenantLogoUrl: string | null;
  containerMode?: "page" | "overlay";
  effectiveGovernance: SceActivityEffectiveGovernance;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: (result: SceActivityCreateSuccessResult<{ eventId: string; outcome: string }>) => void;
  initialDraftId?: string | null;
  initialResumeDraft?: { draftId: string; payload: TournamentComposerDraftPayload } | null;
  reviewerComment?: string | null;
  originContext?: SceActivityCreateOriginContext;
  successBehavior?: "navigate" | "stay";
};

type ParticipantRow = TournamentComposerDraftPayload["participants"][number];

let localIdCounter = 0;
function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
}

function resolveResourceMeta(
  facilityGroups: FacilityGroup[],
  facilityResourceId: string,
): { name: string; facilityName: string; code: string } {
  for (const group of facilityGroups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) {
      return { name: resource.name, facilityName: group.facilityName, code: resource.code };
    }
  }
  return { name: facilityResourceId, facilityName: "", code: facilityResourceId };
}

function formatTeamLabel(team: TournamentTeamOption): string {
  const suffix = [team.ageGroup, team.genderGroup].filter(Boolean).join(" / ");
  return suffix ? `${team.name} · ${suffix}` : team.name;
}

export default function TournamentCreateForm({
  activeSeasonId,
  seasonOptions,
  teamOptions,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  tenantClubName,
  tenantLogoUrl,
  containerMode = "page",
  effectiveGovernance,
  open = true,
  onClose,
  onSuccess,
  initialDraftId = null,
  initialResumeDraft = null,
  reviewerComment = null,
  originContext,
  successBehavior = "navigate",
  defaultTournamentDurationMinutes,
}: Props) {
  const router = useRouter();
  const serverHydrated = initialResumeDraft?.payload
    ? hydrateTournamentComposerFormFromDraft(initialResumeDraft.payload)
    : null;

  const [seasonId, setSeasonId] = useState(serverHydrated?.seasonId || activeSeasonId);
  const [title, setTitle] = useState(serverHydrated?.title ?? "Turnier");
  const [description, setDescription] = useState(serverHydrated?.description ?? "");
  const [competitionLabel, setCompetitionLabel] = useState(serverHydrated?.competitionLabel ?? "");
  const [resultLabel, setResultLabel] = useState(serverHydrated?.resultLabel ?? "");
  const [remarks, setRemarks] = useState(serverHydrated?.remarks ?? "");
  const [location, setLocation] = useState(serverHydrated?.location ?? "");
  const [homeAway, setHomeAway] = useState<"HOME" | "AWAY">(serverHydrated?.homeAway ?? "HOME");
  const [startAt, setStartAt] = useState(serverHydrated?.startAt ?? "");
  const [endAt, setEndAt] = useState(serverHydrated?.endAt ?? "");
  const [meetingTime, setMeetingTime] = useState(serverHydrated?.meetingTime ?? "");
  const [organizerSelection, setOrganizerSelection] = useState<ExternalClubPickerResult | null>(
    serverHydrated?.homeAway === "AWAY" && serverHydrated.organizerExternalClubId
      ? {
          id: serverHydrated.organizerExternalClubId,
          name: serverHydrated.organizerExternalClubName ?? "",
          shortName: null,
        }
      : null,
  );
  const [participants, setParticipants] = useState<ParticipantRow[]>(serverHydrated?.participants ?? []);
  const [resourceAllocations, setResourceAllocations] = useState<
    TournamentComposerDraftPayload["resourceAllocations"]
  >(serverHydrated?.resourceAllocations ?? []);

  const initialPub = serverHydrated?.publication ?? resolveTournamentPublicationDefaultsForCreate();
  const [websiteVisible, setWebsiteVisible] = useState(initialPub.websiteVisible);
  const [infoboardVisible, setInfoboardVisible] = useState(initialPub.infoboardVisible);
  const [homepageVisible, setHomepageVisible] = useState(initialPub.homepageVisible);
  const [wochenplanVisible, setWochenplanVisible] = useState(initialPub.wochenplanVisible);
  const [teamPageVisible, setTeamPageVisible] = useState(initialPub.teamPageVisible);
  const [planner, setPlanner] = useState<TournamentComposerPlannerDraft | null>(
    serverHydrated?.homeAway === "HOME"
      ? (serverHydrated.planner ?? createDefaultTournamentComposerPlannerDraft())
      : null,
  );

  const [draftId, setDraftId] = useState<string | null>(initialResumeDraft?.draftId ?? initialDraftId);
  const [persistedBaseline, setPersistedBaseline] = useState<TournamentComposerDraftPayload | null>(
    initialResumeDraft?.payload ?? null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [participantNotice, setParticipantNotice] = useState<string | null>(null);

  useEffect(() => {
    if (activeSeasonId) setSeasonId(activeSeasonId);
  }, [activeSeasonId]);

  useEffect(() => {
    if (homeAway === "HOME") {
      setPlanner((prev) => prev ?? createDefaultTournamentComposerPlannerDraft());
    } else {
      setPlanner(null);
    }
  }, [homeAway]);

  useEffect(() => {
    if (homeAway === "HOME") {
      setOrganizerSelection(null);
    }
  }, [homeAway]);

  useEffect(() => {
    if (homeAway !== "HOME") return;
    setPlanner((prev) => {
      if (!prev) return prev;
      return reconcileComposerPlannerForParticipants({
        planner: prev,
        participantCount: countComposerCuratedTemplateParticipants(participants),
      });
    });
  }, [homeAway, participants]);

  const scheduleInterval = useMemo(() => {
    if (!startAt) return null;
    try {
      const start = new Date(startAt);
      if (Number.isNaN(start.getTime())) return null;
      const end = endAt ? new Date(endAt) : null;
      return {
        startAt: start.toISOString(),
        endAt: end && !Number.isNaN(end.getTime()) ? end.toISOString() : undefined,
      };
    } catch {
      return null;
    }
  }, [startAt, endAt]);

  const { pitchAvailability, dressingRoomAvailability } = useFacilityAvailability({
    enabled: homeAway === "HOME" && scheduleInterval != null,
    startAt: scheduleInterval?.startAt ?? "",
    endAt: scheduleInterval?.endAt,
  });

  const availableTeams = teamOptions;

  const buildPayload = useCallback((): TournamentComposerDraftPayload => {
    const organiserFields = sanitizeOrganiserDraftFields(
      homeAway,
      organizerSelection?.id ?? null,
      organizerSelection?.name ?? null,
    );
    return {
      seasonId,
      title,
      description,
      competitionLabel,
      resultLabel,
      remarks,
      location,
      homeAway,
      startAt,
      endAt,
      meetingTime,
      organizerExternalClubId: organiserFields.organizerExternalClubId,
      organizerExternalClubName: organiserFields.organizerExternalClubName,
      participants,
      resourceAllocations,
      publication: {
        websiteVisible,
        infoboardVisible,
        homepageVisible,
        wochenplanVisible,
        teamPageVisible,
      },
      planner: homeAway === "HOME" ? planner : null,
    };
  }, [
    seasonId,
    title,
    description,
    competitionLabel,
    resultLabel,
    remarks,
    location,
    homeAway,
    startAt,
    endAt,
    meetingTime,
    organizerSelection,
    participants,
    resourceAllocations,
    websiteVisible,
    infoboardVisible,
    homepageVisible,
    wochenplanVisible,
    teamPageVisible,
    planner,
  ]);

  const composerDraft = useMemo(() => buildPayload(), [buildPayload]);
  const tabErrors = useMemo(
    () => (submitAttempted ? computeTournamentCreateTabErrors(buildPayload()) : {}),
    [submitAttempted, buildPayload],
  );

  const resumeDraft = useMemo((): SceActivityCreateResumeDraft<TournamentComposerDraftPayload> | undefined => {
    if (!draftId || !persistedBaseline) return undefined;
    return { draftId, baselineDraft: persistedBaseline };
  }, [draftId, persistedBaseline]);

  const composerTitle = useMemo(
    () => (resumeDraft ? resolveTournamentComposerTitleForResume(title) : "Turnier erstellen"),
    [resumeDraft, title],
  );

  const seasonPickerOptions = useMemo(
    () =>
      seasonOptions.map((season) => ({
        value: season.id,
        label: `${season.name}${season.isActive ? " (aktuell)" : ""}`,
      })),
    [seasonOptions],
  );

  const definition = useMemo((): SceActivityCreateDefinition<
    TournamentComposerDraftPayload,
    { eventId: string; outcome: string },
    TournamentCreateTabId
  > => {
    return {
      activityKind: "TOURNAMENT",
      title: composerTitle,
      createActionLabel: "Turnier erstellen",
      defaultTab: "termin",
      buildTabNavigationConfig: ({ tabErrors }) =>
        buildTournamentCreateTabNavigationConfig({ homeAway, tabErrors }),
      guidedWorkflow: {
        finalReviewTab: "uebersicht",
        validateStep: validateTournamentCreateWorkflowStep,
        resolveStepValid: resolveTournamentCreateStepValid,
      },
      initialDraft: buildPayload(),
      validateDraft: (draft) => {
        const errors = computeTournamentCreateTabErrors(draft);
        return {
          valid: Object.keys(errors).length === 0,
          tabErrors: errors,
          firstInvalidTab: firstInvalidTournamentCreateTab(errors, homeAway) ?? undefined,
        };
      },
      submitDraft: async (draft) => {
        setSubmitAttempted(true);
        const payload = { ...buildPayload(), ...draft };
        const res = await fetch("/api/tournament/composer/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, payload }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          outcome?: string;
          eventId?: string;
        } | null;
        if (!res.ok) {
          return { ok: false as const, error: data?.error ?? "Turnier konnte nicht erstellt werden." };
        }
        return {
          ok: true as const,
          result: { eventId: data?.eventId ?? "", outcome: data?.outcome ?? "PUBLISHED" },
        };
      },
      draftPersistence: {
        supportsDraftPersistence: true,
        validateDraftForSave: () => ({ valid: true, tabErrors: {} }),
        saveDraft: async ({ draft, draftId: existingDraftId }) => {
          const payload = { ...buildPayload(), ...draft };
          const res = await fetch("/api/tournament/composer/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId: existingDraftId ?? draftId, payload }),
          });
          const data = (await res.json().catch(() => null)) as { error?: string; draftId?: string } | null;
          if (!res.ok || !data?.draftId) {
            return { ok: false as const, error: data?.error ?? "Entwurf speichern fehlgeschlagen." };
          }
          setDraftId(data.draftId);
          setPersistedBaseline(payload);
          return { ok: true as const, result: { draftId: data.draftId }, draftId: data.draftId };
        },
      },
      tabs: [],
    };
  }, [buildPayload, composerTitle, draftId, homeAway]);

  const handleComposerSuccess = useCallback(
    (result: SceActivityCreateSuccessResult<{ eventId: string; outcome: string }>) => {
      onSuccess?.(result);
      if (successBehavior === "stay") {
        router.refresh();
        return;
      }
      if (result.outcome === "SUBMITTED_FOR_APPROVAL") {
        router.push("/dashboard/tournamentcenter?submitted=1");
        router.refresh();
        return;
      }
      router.push("/dashboard/tournamentcenter?submitted=1");
      router.refresh();
    },
    [onSuccess, router, successBehavior],
  );

  useEffect(() => {
    if (initialResumeDraft || !initialDraftId) return;
    let active = true;
    async function loadDraft() {
      setLoadError(null);
      const res = await fetch(`/api/tournament/composer/drafts/${encodeURIComponent(initialDraftId!)}`);
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        draftId?: string;
        payload?: TournamentComposerDraftPayload;
      } | null;
      if (!active) return;
      if (!res.ok || !data?.payload || !data.draftId) {
        setLoadError(data?.error ?? "Entwurf konnte nicht geladen werden.");
        return;
      }
      const hydrated = hydrateTournamentComposerFormFromDraft(data.payload);
      setDraftId(data.draftId);
      setPersistedBaseline(data.payload);
      setSeasonId(hydrated.seasonId);
      setTitle(hydrated.title);
      setDescription(hydrated.description);
      setParticipants(hydrated.participants);
      setResourceAllocations(hydrated.resourceAllocations);
      setHomeAway(hydrated.homeAway);
      setLocation(hydrated.location);
      setStartAt(hydrated.startAt);
      setEndAt(hydrated.endAt);
      setMeetingTime(hydrated.meetingTime);
      setOrganizerSelection(
        hydrated.homeAway === "AWAY" && hydrated.organizerExternalClubId
          ? { id: hydrated.organizerExternalClubId, name: hydrated.organizerExternalClubName ?? "", shortName: null }
          : null,
      );
      setPlanner(
        hydrated.homeAway === "HOME"
          ? reconcileComposerPlannerForParticipants({
              planner: hydrated.planner ?? createDefaultTournamentComposerPlannerDraft(),
              participantCount: countComposerCuratedTemplateParticipants(hydrated.participants),
            })
          : null,
      );
    }
    void loadDraft();
    return () => {
      active = false;
    };
  }, [defaultTournamentDurationMinutes, initialDraftId, initialResumeDraft]);

  const participantIdentities = useMemo(
    () =>
      buildTournamentLobbyParticipantIdentities({
        participants,
        tenantClubName,
        tenantLogoUrl,
      }),
    [participants, tenantClubName, tenantLogoUrl],
  );

  const ownTeamIdentities = useMemo(
    () => participantIdentities.filter((p) => p.kind === "TEAM"),
    [participantIdentities],
  );
  const externalClubIdentities = useMemo(
    () => participantIdentities.filter((p) => p.kind === "EXTERNAL_CLUB"),
    [participantIdentities],
  );
  const manualIdentities = useMemo(
    () => participantIdentities.filter((p) => p.kind === "MANUAL"),
    [participantIdentities],
  );

  const resourceDressingRoomSubjectPresentations = useMemo(
    () =>
      buildTournamentResourceDressingRoomSubjectPresentations({
        participants,
        tenantClubName,
        tenantLogoUrl,
      }),
    [participants, tenantClubName, tenantLogoUrl],
  );

  const resourceDressingRoomPresentationByLocalId = useMemo(
    () => new Map(resourceDressingRoomSubjectPresentations.map((row) => [row.localId, row])),
    [resourceDressingRoomSubjectPresentations],
  );

  const effectiveOrganiserSelection = useMemo(
    () =>
      resolveEffectiveOrganiserSelection({
        homeAway,
        externalSelection: organizerSelection,
        tenantClubName,
        tenantLogoUrl,
      }),
    [homeAway, organizerSelection, tenantClubName, tenantLogoUrl],
  );

  function removeParticipant(localId: string) {
    setParticipants((prev) => prev.filter((row) => row.localId !== localId));
    setParticipantNotice(null);
  }

  const renderParticipantPlayingUnitsFooter = useCallback(
    (participantLocalId: string) => {
      const participant = participants.find((p) => p.localId === participantLocalId);
      if (!participant) return null;
      return (
        <TournamentComposerPlayingUnitsPanel
          participantLocalId={participant.localId}
          participantDisplayName={participant.displayName}
          units={participant.playingUnits}
          onSplit={() => {
            setParticipants((prev) =>
              prev.map((row) =>
                row.localId === participantLocalId
                  ? {
                      ...row,
                      playingUnits: splitComposerParticipantIntoDefaultSubunits({
                        participantLocalId: row.localId,
                        baseDisplayName: row.displayName,
                        existingUnits: row.playingUnits,
                        nextLocalId: () => nextLocalId("unit"),
                      }),
                    }
                  : row,
              ),
            );
          }}
          onAddSubunit={() => {
            setParticipants((prev) =>
              prev.map((row) =>
                row.localId === participantLocalId
                  ? {
                      ...row,
                      playingUnits: addComposerPlayingUnitSubunit({
                        units: row.playingUnits ?? [],
                        baseDisplayName: row.displayName,
                        nextLocalId: () => nextLocalId("unit"),
                      }),
                    }
                  : row,
              ),
            );
          }}
          onRename={(unitLocalId, displayName) => {
            setParticipants((prev) =>
              prev.map((row) =>
                row.localId === participantLocalId && row.playingUnits
                  ? {
                      ...row,
                      playingUnits: updateComposerPlayingUnitName(
                        row.playingUnits,
                        unitLocalId,
                        displayName,
                      ),
                    }
                  : row,
              ),
            );
          }}
          onRemove={(unitLocalId) => {
            setParticipants((prev) =>
              prev.map((row) =>
                row.localId === participantLocalId && row.playingUnits
                  ? {
                      ...row,
                      playingUnits: removeComposerPlayingUnit(row.playingUnits, unitLocalId),
                    }
                  : row,
              ),
            );
          }}
        />
      );
    },
    [participants],
  );

  function rejectDuplicateParticipant(): boolean {
    setParticipantNotice("Dieser Teilnehmer ist bereits im Turnier.");
    return true;
  }

  function addTeamParticipant(teamId: string) {
    const team = teamOptions.find((t) => t.id === teamId);
    if (!team) return;
    if (isDuplicateTournamentParticipant(participants, { kind: "TEAM", teamId })) {
      rejectDuplicateParticipant();
      return;
    }
    setParticipantNotice(null);
    setParticipants((prev) => [
      ...prev,
      {
        localId: nextLocalId("team"),
        kind: "TEAM" as TournamentParticipantDraftKind,
        teamId,
        displayName: formatTeamLabel(team),
        subLabel: tenantClubName,
        dressingRooms: [],
      },
    ]);
  }

  function addExternalClubParticipant(club: ExternalClubPickerResult) {
    if (
      isDuplicateTournamentParticipant(participants, {
        kind: "EXTERNAL_CLUB",
        externalClubId: club.id,
      })
    ) {
      rejectDuplicateParticipant();
      return;
    }
    setParticipantNotice(null);
    setParticipants((prev) => [
      ...prev,
      {
        localId: nextLocalId("ext"),
        kind: "EXTERNAL_CLUB" as TournamentParticipantDraftKind,
        externalClubId: club.id,
        displayName: club.name,
        subLabel: "Externer Verein",
        externalClubLogoUrl: club.logoUrl ?? null,
        dressingRooms: [],
      },
    ]);
  }

  function addManualParticipant(label: string) {
    if (isDuplicateTournamentParticipant(participants, { kind: "MANUAL", manualLabel: label })) {
      rejectDuplicateParticipant();
      return;
    }
    setParticipantNotice(null);
    setParticipants((prev) => [
      ...prev,
      {
        localId: nextLocalId("manual"),
        kind: "MANUAL" as TournamentParticipantDraftKind,
        manualLabel: label,
        displayName: label,
        subLabel: "Manuell",
        dressingRooms: [],
      },
    ]);
  }

  function renderTeamsPanel(fieldErrors?: Record<string, string>) {
    return (
      <PlanningEditorSection testId="tournament-create-teams-section" ariaLabelledBy="tournament-create-teams-heading">
        <PlanningEditorSectionHeading id="tournament-create-teams-heading" title="Teams" />
        {fieldErrors?.participants ? (
          <p role="alert" className="mb-3 text-sm text-[var(--sce-danger)]">
            {fieldErrors.participants}
          </p>
        ) : null}
        <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
          <label className="block space-y-2 sm:col-span-2">
            <span className="fca-label">Titel</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="fca-input" data-testid="tournament-create-title" />
          </label>
          <label className="block space-y-2">
            <span className="fca-label">Saison</span>
            <StaticOptionSearchablePicker options={seasonPickerOptions} value={seasonId} onChange={setSeasonId} testId="tournament-create-season" />
          </label>
          <div className="block space-y-2">
            <span className="fca-label">Heim / Auswärts</span>
            <HomeAwaySegmentedControl value={homeAway} onChange={setHomeAway} testId="tournament-create-home-away" aria-label="Heim / Auswärts" />
          </div>
          <TournamentOrganizerClubField
            homeAway={homeAway}
            tenantClubName={tenantClubName}
            tenantLogoUrl={tenantLogoUrl}
            selected={organizerSelection}
            onChange={setOrganizerSelection}
            fieldError={fieldErrors?.organizer}
            testId="tournament-create-organizer-club"
          />
        </div>
        {participantNotice ? (
          <p role="status" className="mt-4 text-sm text-[var(--sce-danger)]" data-testid="tournament-participant-duplicate-notice">
            {participantNotice}
          </p>
        ) : null}
        <div className="mt-6 space-y-6" data-testid="tournament-create-participant-lobby">
          <div
            className="flex flex-wrap items-baseline justify-between gap-2"
            data-testid="tournament-create-participant-lobby-header"
          >
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Teilnehmer</h3>
            <p className="text-sm text-[var(--text-2)]" data-testid="tournament-create-participant-total">
              {participants.length} gesamt
            </p>
          </div>
          <TournamentOwnTeamsSection
            identities={ownTeamIdentities}
            availableTeams={availableTeams.map((t) => ({ ...t, isActive: true }))}
            tenantLogoUrl={tenantLogoUrl}
            tenantClubName={tenantClubName}
            onAddTeam={addTeamParticipant}
            onRemoveParticipant={removeParticipant}
            renderParticipantFooter={renderParticipantPlayingUnitsFooter}
          />
          <TournamentExternalClubsSection
            identities={externalClubIdentities}
            onAddExternalClub={addExternalClubParticipant}
            onRemoveParticipant={removeParticipant}
            renderParticipantFooter={renderParticipantPlayingUnitsFooter}
          />
          <TournamentManualParticipantSection
            identities={manualIdentities}
            onAddManual={addManualParticipant}
            onRemoveParticipant={removeParticipant}
            renderParticipantFooter={renderParticipantPlayingUnitsFooter}
          />
        </div>
      </PlanningEditorSection>
    );
  }

  function renderTerminPanel(fieldErrors?: Record<string, string>) {
    return (
      <PlanningEditorSection testId="tournament-create-schedule-section" ariaLabelledBy="tournament-create-schedule-heading">
        <PlanningEditorSectionHeading id="tournament-create-schedule-heading" title="Termin" />
        <SceActivityDateTimeInput
          value={{ startAt, endAt }}
          onChange={({ startAt: s, endAt: e }) => {
            setStartAt(s);
            setEndAt(e);
          }}
          fieldErrors={fieldErrors}
          testId="tournament-create-schedule"
        />
        <label className="mt-4 block space-y-2">
          <span className="fca-label">{homeAway === "AWAY" ? "Austragungsort" : "Ort (optional)"}</span>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="fca-input" data-testid="tournament-create-location" />
        </label>
      </PlanningEditorSection>
    );
  }

  function renderRessourcenPanel() {
    if (homeAway !== "HOME") {
      return (
        <PlanningEditorSection testId="tournament-create-resources-away-section">
          <p className="text-sm text-[var(--text-2)]">Auswärtsturnier — keine Vereinsressourcen.</p>
        </PlanningEditorSection>
      );
    }
    const allocatedIds = new Set(resourceAllocations.map((r) => r.facilityResourceId));
    return (
      <PlanningEditorSection testId="tournament-create-resources-section">
        <p className="mb-3 text-xs text-[var(--text-2)]">
          Physische Anlagen (Kunstrasen, Halle) — getrennt von den logischen Turnierfeldern im Schritt Spielfelder.
          Optional; Zuordnung kann auch später erfolgen.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PlanningResourceAssignmentKindIcon kind="pitch_hall" />
            <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Spielfeld / Halle</p>
          </div>
          <PlanningSingleResourceAssignment
            kind="pitch_hall"
            showSubjectLabel={false}
            suppressKindIcon
            subjectLabel="Spielfeld / Halle"
            resourceName={resourceAllocations[0]?.facilityResourceName ?? null}
            unassignedLabel="Noch kein Spielfeld / keine Halle zugewiesen."
            facilityGroups={pitchHallFacilityGroups}
            selectedResourceIds={allocatedIds}
            onSelect={(id) => {
              const meta = resolveResourceMeta(pitchHallFacilityGroups, id);
              setResourceAllocations([
                {
                  localId: nextLocalId("res"),
                  facilityResourceId: id,
                  facilityResourceName: meta.name,
                  facilityName: meta.facilityName,
                  code: meta.code,
                },
              ]);
            }}
            onDeselect={(id) => setResourceAllocations((prev) => prev.filter((r) => r.facilityResourceId !== id))}
            availabilityByResourceId={pitchAvailability}
            canManage
            testId="tournament-create-resource"
          />
          {participants.length > 0 ? (
            <PlanningSubjectDressingRoomAssignments
              subjects={participants.map((p) => {
                const presentation = resourceDressingRoomPresentationByLocalId.get(p.localId);
                return {
                  id: p.localId,
                  displayName: presentation?.subjectLabel ?? p.displayName,
                  secondaryLabel: presentation?.subjectSecondary ?? null,
                  crest: presentation ? (
                    <SceTournamentResourceParticipantCrest
                      identity={presentation.identity}
                      testId={`tournament-create-dressing-crest-${p.localId}`}
                    />
                  ) : undefined,
                  dressingRoomAllocations: p.dressingRooms.map((d) => ({
                    facilityResourceId: d.facilityResourceId,
                    facilityResourceName: d.facilityResourceName,
                  })),
                };
              })}
              facilityGroups={dressingRoomFacilityGroups}
              dressingRoomAvailability={dressingRoomAvailability}
              canManage
              onSelectResource={(subjectId, facilityResourceId) => {
                const meta = resolveResourceMeta(dressingRoomFacilityGroups, facilityResourceId);
                setParticipants((prev) =>
                  prev.map((p) =>
                    p.localId === subjectId
                      ? {
                          ...p,
                          dressingRooms: [
                            {
                              facilityResourceId,
                              facilityResourceName: meta.name,
                              facilityName: meta.facilityName,
                            },
                          ],
                        }
                      : p,
                  ),
                );
              }}
              onDeselectResource={(subjectId) =>
                setParticipants((prev) =>
                  prev.map((p) => (p.localId === subjectId ? { ...p, dressingRooms: [] } : p)),
                )
              }
              testId="tournament-create-dressing"
            />
          ) : null}
        </div>
      </PlanningEditorSection>
    );
  }

  const publikationPanel = (
    <PlanningEditorSection testId="tournament-create-publication-section">
      <TournamentPublicationToggles
        value={{ websiteVisible, infoboardVisible, homepageVisible, wochenplanVisible, teamPageVisible }}
        onChange={(patch) => {
          if (patch.websiteVisible !== undefined) setWebsiteVisible(patch.websiteVisible);
          if (patch.infoboardVisible !== undefined) setInfoboardVisible(patch.infoboardVisible);
          if (patch.homepageVisible !== undefined) setHomepageVisible(patch.homepageVisible);
          if (patch.wochenplanVisible !== undefined) setWochenplanVisible(patch.wochenplanVisible);
          if (patch.teamPageVisible !== undefined) setTeamPageVisible(patch.teamPageVisible);
        }}
        testIdPrefix="tournament-create-publication"
      />
    </PlanningEditorSection>
  );

  const uebersichtPanel = (
    <PlanningEditorSection testId="tournament-create-review-section" ariaLabelledBy="tournament-create-review-heading">
      <PlanningEditorSectionHeading id="tournament-create-review-heading" title="Übersicht" />
      <TournamentCreateReviewPanel
        payload={composerDraft}
        organizer={effectiveOrganiserSelection}
        tenantClubName={tenantClubName}
        tenantLogoUrl={tenantLogoUrl}
        pitchHallFacilityGroups={pitchHallFacilityGroups}
        dressingRoomFacilityGroups={dressingRoomFacilityGroups}
      />
    </PlanningEditorSection>
  );

  const homeTabs =
    planner != null
      ? [
          { key: "turnierformat" as const, label: "Turnierformat", render: (ctx?: { fieldErrors?: Record<string, string> }) =>
            <TournamentComposerTurnierformatPanel planner={planner} participantCount={countComposerCuratedTemplateParticipants(participants)} onChange={(fn) => setPlanner((p) => (p ? fn(p) : p))} fieldErrors={ctx?.fieldErrors} /> },
          { key: "spielfelder" as const, label: "Spielfelder", render: (ctx?: { fieldErrors?: Record<string, string> }) =>
            <TournamentComposerSpielfelderPanel planner={planner} participantCount={countComposerCuratedTemplateParticipants(participants)} onChange={(fn) => setPlanner((p) => (p ? fn(p) : p))} fieldErrors={ctx?.fieldErrors} /> },
          { key: "spielplan" as const, label: "Spielplan", render: (ctx?: { fieldErrors?: Record<string, string> }) =>
            <TournamentComposerSpielplanPanel payload={composerDraft} planner={planner} onChange={(fn) => setPlanner((p) => (p ? fn(p) : p))} fieldErrors={ctx?.fieldErrors} /> },
        ]
      : [];

  definition.tabs = [
    { key: "termin", label: "Termin", render: (ctx) => renderTerminPanel(ctx?.fieldErrors) },
    { key: "teams", label: "Teams", render: (ctx) => renderTeamsPanel(ctx?.fieldErrors) },
    ...homeTabs,
    { key: "ressourcen", label: "Ressourcen", render: () => renderRessourcenPanel() },
    { key: "publikation", label: "Publikation", render: () => publikationPanel },
    { key: "uebersicht", label: "Übersicht", render: () => uebersichtPanel },
  ];

  return (
    <div data-testid="tournament-create-form">
      {reviewerComment ? (
        <div className="fca-status-box mb-3" data-testid="tournament-reviewer-comment">
          <p className="text-sm">{reviewerComment}</p>
        </div>
      ) : null}
      {loadError ? <div className="fca-status-box fca-status-box-error mb-3">{loadError}</div> : null}
      <SceActivityComposer
        key={resumeDraft?.draftId ?? "tournament-create-new"}
        definition={definition}
        draft={composerDraft}
        containerMode={containerMode}
        open={open}
        onClose={onClose ?? (() => router.push("/dashboard/tournamentcenter"))}
        onSuccess={handleComposerSuccess}
        effectiveGovernance={effectiveGovernance}
        resumeDraft={resumeDraft}
        originContext={originContext}
        testId="tournament-create-composer"
      />
    </div>
  );
}
