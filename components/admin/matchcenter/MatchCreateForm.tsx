"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SceActivityComposer from "@/components/sce/activity-composer/SceActivityComposer";
import type { SceActivityCreateDefinition } from "@/lib/sce/activity-composer/types";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import type { SceActivityCreateSuccessResult } from "@/lib/sce/activity-composer/success-result";
import type { MatchComposerDraftPayload } from "@/lib/matchcenter/composer/match-composer-draft-types";
import { resolveMatchComposerTitleForResume } from "@/lib/matchcenter/composer/match-composer-draft-access";
import { hydrateMatchComposerFormFromDraft } from "@/lib/matchcenter/composer/hydrate-match-composer-form-from-draft";
import type { SceActivityCreateResumeDraft } from "@/lib/sce/activity-composer/draft-persistence-capability";
import { buildMatchCreateTabNavigationConfig } from "@/lib/matchcenter/match-create-workflow-config";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { PlanningSingleResourceAssignment } from "@/components/admin/shared/planning/PlanningSingleResourceAssignment";
import { PlanningResourceAssignmentKindIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { PlanningMatchDressingRoomAssignments } from "@/components/admin/shared/planning/PlanningMatchDressingRoomAssignments";
import type { SceActivityCreateOriginContext } from "@/lib/sce/activity-composer/origin-context";
import PlanningEditorSection from "@/components/admin/shared/planning-editor/PlanningEditorSection";
import PlanningEditorSectionHeading from "@/components/admin/shared/planning-editor/PlanningEditorSectionHeading";
import { PLANNING_EDITOR_FORM_GRID_CLASS, PLANNING_RESOURCE_SECTION_LABEL_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import { HomeAwaySegmentedControl } from "@/components/admin/shared/HomeAwaySegmentedControl";
import MatchPublicationToggles from "@/components/admin/matchcenter/MatchPublicationToggles";
import { ExternalClubPicker, type ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";
import { useFacilityAvailability } from "@/hooks/use-facility-availability";
import { resolveMatchPublicationDefaultsForCreate } from "@/lib/publishing/policy/match-publication-defaults";
import {
  computeMatchCreateTabErrors,
  firstInvalidMatchCreateTab,
} from "@/lib/matchcenter/match-create-validation";
import type { MatchTeamOption } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import { MatchClubPair } from "@/components/sporting-activity/MatchClubPair";
import { buildMatchCreatePreviewClubPair } from "@/lib/matchcenter/composer/build-match-create-preview-pair";
import { useTranslations } from "next-intl";

type Props = {
  activeSeasonId: string;
  teamOptions: MatchTeamOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  tenantClubName: string;
  tenantLogoUrl: string | null;
  containerMode?: "page" | "overlay";
  effectiveGovernance: SceActivityEffectiveGovernance;
  open?: boolean;
  onClose?: () => void;
  onSuccess?: (result: SceActivityCreateSuccessResult<{ eventId: string; outcome: string }>) => void;
  initialDraftId?: string | null;
  initialResumeDraft?: { draftId: string; payload: MatchComposerDraftPayload } | null;
  reviewerComment?: string | null;
  originContext?: SceActivityCreateOriginContext;
  successBehavior?: "navigate" | "stay";
};

function formatTeamLabel(team: MatchTeamOption): string {
  const suffix = [team.ageGroup, team.genderGroup].filter(Boolean).join(" / ");
  return suffix ? `${team.name} · ${suffix}` : team.name;
}

function resolveResourceDisplay(facilityGroups: FacilityGroup[], facilityResourceId: string): string {
  for (const group of facilityGroups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) return resource.name;
  }
  return facilityResourceId;
}

function resolveResourceCode(facilityGroups: FacilityGroup[], facilityResourceId: string): string {
  for (const group of facilityGroups) {
    const resource = group.resources.find((r) => r.id === facilityResourceId);
    if (resource) return resource.code;
  }
  return facilityResourceId;
}

export default function MatchCreateForm({
  activeSeasonId,
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
}: Props) {
  const router = useRouter();
  const tResources = useTranslations("PlanningResources");
  const serverHydrated = initialResumeDraft?.payload
    ? hydrateMatchComposerFormFromDraft(initialResumeDraft.payload)
    : null;

  const [seasonId, setSeasonId] = useState(serverHydrated?.seasonId || activeSeasonId);
  const [teamId, setTeamId] = useState(serverHydrated?.teamId ?? "");
  const [homeAway, setHomeAway] = useState<"HOME" | "AWAY">(serverHydrated?.homeAway ?? "HOME");
  const [location, setLocation] = useState(serverHydrated?.location ?? "");
  const [opponentName, setOpponentName] = useState(serverHydrated?.opponentName ?? "");
  const [selectedExternalClub, setSelectedExternalClub] = useState<ExternalClubPickerResult | null>(
    serverHydrated?.opponentExternalClubId
      ? {
          id: serverHydrated.opponentExternalClubId,
          name: serverHydrated.opponentExternalClubName ?? "",
          shortName: null,
        }
      : null,
  );
  const [startAt, setStartAt] = useState(serverHydrated?.startAt ?? "");
  const [endAt, setEndAt] = useState(serverHydrated?.endAt ?? "");
  const [competitionLabel, setCompetitionLabel] = useState(serverHydrated?.spielbetrieb.competitionLabel ?? "");
  const [remarks, setRemarks] = useState(serverHydrated?.spielbetrieb.remarks ?? "");

  const initialPub = serverHydrated?.publication ?? resolveMatchPublicationDefaultsForCreate(homeAway);
  const [websiteVisible, setWebsiteVisible] = useState(initialPub.websiteVisible);
  const [infoboardVisible, setInfoboardVisible] = useState(initialPub.infoboardVisible);
  const [homepageVisible, setHomepageVisible] = useState(initialPub.homepageVisible);
  const [wochenplanVisible, setWochenplanVisible] = useState(initialPub.wochenplanVisible);
  const [teamPageVisible, setTeamPageVisible] = useState(initialPub.teamPageVisible);

  const [pitchResourceId, setPitchResourceId] = useState<string | null>(
    serverHydrated?.resources.find((r) => r.kind === "pitch_hall")?.facilityResourceId ?? null,
  );
  const [homeDressingResourceId, setHomeDressingResourceId] = useState<string | null>(
    serverHydrated?.resources.find((r) => r.kind === "dressing_room_home")?.facilityResourceId ?? null,
  );
  const [awayDressingResourceId, setAwayDressingResourceId] = useState<string | null>(
    serverHydrated?.resources.find((r) => r.kind === "dressing_room_away")?.facilityResourceId ?? null,
  );

  const [draftId, setDraftId] = useState<string | null>(initialResumeDraft?.draftId ?? initialDraftId);
  const [persistedBaseline, setPersistedBaseline] = useState<MatchComposerDraftPayload | null>(
    initialResumeDraft?.payload ?? null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const selectedTeam = useMemo(() => teamOptions.find((t) => t.id === teamId) ?? null, [teamId, teamOptions]);

  useEffect(() => {
    if (serverHydrated?.publication) return;
    const defaults = resolveMatchPublicationDefaultsForCreate(homeAway);
    setWebsiteVisible(defaults.websiteVisible);
    setInfoboardVisible(defaults.infoboardVisible);
    setWochenplanVisible(defaults.wochenplanVisible);
    setHomepageVisible(defaults.homepageVisible);
    setTeamPageVisible(defaults.teamPageVisible);
  }, [homeAway, serverHydrated?.publication]);

  useEffect(() => {
    if (activeSeasonId) setSeasonId(activeSeasonId);
  }, [activeSeasonId]);

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

  function getEffectiveOpponentDisplayName(): string {
    const override = opponentName.trim();
    if (selectedExternalClub) return override || selectedExternalClub.name;
    return override;
  }

  const buildPayload = useCallback((): MatchComposerDraftPayload => {
    const resources: MatchComposerDraftPayload["resources"] = [];
    if (homeAway === "HOME" && pitchResourceId) {
      resources.push({
        kind: "pitch_hall",
        facilityResourceId: pitchResourceId,
        facilityResourceName: resolveResourceDisplay(pitchHallFacilityGroups, pitchResourceId),
        code: resolveResourceCode(pitchHallFacilityGroups, pitchResourceId),
      });
    }
    if (homeAway === "HOME" && homeDressingResourceId) {
      resources.push({
        kind: "dressing_room_home",
        facilityResourceId: homeDressingResourceId,
        facilityResourceName: resolveResourceDisplay(dressingRoomFacilityGroups, homeDressingResourceId),
        code: resolveResourceCode(dressingRoomFacilityGroups, homeDressingResourceId),
      });
    }
    if (homeAway === "HOME" && awayDressingResourceId) {
      resources.push({
        kind: "dressing_room_away",
        facilityResourceId: awayDressingResourceId,
        facilityResourceName: resolveResourceDisplay(dressingRoomFacilityGroups, awayDressingResourceId),
        code: resolveResourceCode(dressingRoomFacilityGroups, awayDressingResourceId),
      });
    }

    return {
      seasonId,
      teamId,
      teamDisplayName: selectedTeam ? formatTeamLabel(selectedTeam) : "",
      homeAway,
      location,
      opponentName,
      opponentExternalClubId: selectedExternalClub?.id ?? null,
      opponentExternalClubName: selectedExternalClub?.name ?? null,
      startAt,
      endAt,
      resources,
      publication: {
        websiteVisible,
        infoboardVisible,
        homepageVisible,
        wochenplanVisible,
        teamPageVisible,
      },
      spielbetrieb: { competitionLabel, remarks },
    };
  }, [
    seasonId,
    teamId,
    selectedTeam,
    homeAway,
    location,
    opponentName,
    selectedExternalClub,
    startAt,
    endAt,
    pitchResourceId,
    homeDressingResourceId,
    awayDressingResourceId,
    pitchHallFacilityGroups,
    dressingRoomFacilityGroups,
    websiteVisible,
    infoboardVisible,
    homepageVisible,
    wochenplanVisible,
    teamPageVisible,
    competitionLabel,
    remarks,
  ]);

  const tabErrors = useMemo(
    () => (submitAttempted ? computeMatchCreateTabErrors(buildPayload()) : {}),
    [submitAttempted, buildPayload],
  );

  const resumeDraft = useMemo((): SceActivityCreateResumeDraft<MatchComposerDraftPayload> | undefined => {
    if (!draftId || !persistedBaseline) return undefined;
    return { draftId, baselineDraft: persistedBaseline };
  }, [draftId, persistedBaseline]);

  const composerTitle = useMemo(() => {
    if (!resumeDraft) return "Spiel erstellen";
    return resolveMatchComposerTitleForResume(
      persistedBaseline?.teamDisplayName,
      getEffectiveOpponentDisplayName(),
    );
  }, [persistedBaseline?.teamDisplayName, resumeDraft, opponentName, selectedExternalClub]);

  const identityPreview = useMemo(() => {
    if (!selectedTeam && !getEffectiveOpponentDisplayName()) return null;
    return buildMatchCreatePreviewClubPair({
      tenantClubName,
      tenantLogoUrl,
      teamDisplayName: selectedTeam ? formatTeamLabel(selectedTeam) : tenantClubName,
      homeAway,
      opponentDisplayName: getEffectiveOpponentDisplayName() || "Gegner",
      opponentExternalClubId: selectedExternalClub?.id ?? null,
      opponentExternalLogoUrl: selectedExternalClub?.logoUrl ?? null,
    });
  }, [tenantClubName, tenantLogoUrl, selectedTeam, homeAway, opponentName, selectedExternalClub]);

  const definition = useMemo((): SceActivityCreateDefinition<
    MatchComposerDraftPayload,
    { eventId: string; outcome: string }
  > => {
    return {
      activityKind: "MATCH",
      title: composerTitle,
      createActionLabel: "Spiel erstellen",
      defaultTab: "uebersicht",
      buildTabNavigationConfig: buildMatchCreateTabNavigationConfig,
      initialDraft: buildPayload(),
      validateDraft: (draft) => {
        const errors = computeMatchCreateTabErrors(draft);
        return {
          valid: Object.keys(errors).length === 0,
          tabErrors: errors,
          firstInvalidTab: firstInvalidMatchCreateTab(errors) ?? undefined,
        };
      },
      submitDraft: async (draft) => {
        setSubmitAttempted(true);
        const payload = { ...buildPayload(), ...draft };
        const res = await fetch("/api/match/composer/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId, payload }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          outcome?: string;
          eventId?: string;
          firstInvalidTab?: string;
        } | null;
        if (!res.ok) {
          return { ok: false as const, error: data?.error ?? "Spiel konnte nicht erstellt werden." };
        }
        return {
          ok: true as const,
          result: {
            eventId: data?.eventId ?? "",
            outcome: data?.outcome ?? "PUBLISHED",
          },
        };
      },
      draftPersistence: {
        supportsDraftPersistence: true,
        validateDraftForSave: () => ({ valid: true, tabErrors: {} }),
        saveDraft: async ({ draft, draftId: existingDraftId }) => {
          const payload = { ...buildPayload(), ...draft };
          const res = await fetch("/api/match/composer/drafts", {
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
  }, [buildPayload, composerTitle, draftId]);

  const handleComposerSuccess = useCallback(
    (result: SceActivityCreateSuccessResult<{ eventId: string; outcome: string }>) => {
      onSuccess?.(result);
      if (successBehavior === "stay") {
        router.refresh();
        return;
      }
      if (result.outcome === "SUBMITTED_FOR_APPROVAL") {
        router.push("/dashboard/matchcenter?submitted=1");
        router.refresh();
        return;
      }
      router.push("/dashboard/matchcenter?submitted=1");
      router.refresh();
    },
    [onSuccess, router, successBehavior],
  );

  useEffect(() => {
    if (initialResumeDraft || !initialDraftId) return;
    let active = true;
    async function loadDraft() {
      setLoadError(null);
      const res = await fetch(`/api/match/composer/drafts/${encodeURIComponent(initialDraftId!)}`);
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        draftId?: string;
        payload?: MatchComposerDraftPayload;
      } | null;
      if (!active) return;
      if (!res.ok || !data?.payload || !data.draftId) {
        setLoadError(data?.error ?? "Entwurf konnte nicht geladen werden.");
        return;
      }
      const hydrated = hydrateMatchComposerFormFromDraft(data.payload);
      setDraftId(data.draftId);
      setPersistedBaseline(data.payload);
      setSeasonId(hydrated.seasonId);
      setTeamId(hydrated.teamId);
      setHomeAway(hydrated.homeAway);
      setLocation(hydrated.location);
      setOpponentName(hydrated.opponentName);
      setSelectedExternalClub(
        hydrated.opponentExternalClubId
          ? {
              id: hydrated.opponentExternalClubId,
              name: hydrated.opponentExternalClubName ?? "",
              shortName: null,
            }
          : null,
      );
      setStartAt(hydrated.startAt);
      setEndAt(hydrated.endAt);
      setCompetitionLabel(hydrated.spielbetrieb.competitionLabel);
      setRemarks(hydrated.spielbetrieb.remarks);
      setPitchResourceId(hydrated.resources.find((r) => r.kind === "pitch_hall")?.facilityResourceId ?? null);
      setHomeDressingResourceId(
        hydrated.resources.find((r) => r.kind === "dressing_room_home")?.facilityResourceId ?? null,
      );
      setAwayDressingResourceId(
        hydrated.resources.find((r) => r.kind === "dressing_room_away")?.facilityResourceId ?? null,
      );
    }
    void loadDraft();
    return () => {
      active = false;
    };
  }, [initialDraftId, initialResumeDraft]);

  const uebersichtPanel = (
    <PlanningEditorSection testId="match-create-overview-section" ariaLabelledBy="match-create-overview-heading">
      <PlanningEditorSectionHeading id="match-create-overview-heading" title="Übersicht" />
      {identityPreview ? (
        <div className="mb-4 space-y-2" data-testid="match-create-identity-preview">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Heim links · Auswärts rechts
          </p>
          <MatchClubPair pair={identityPreview} density="management" />
        </div>
      ) : null}
      <p className="text-sm text-[var(--text-2)]">
        Manuelles Spiel — SFV/importierte Spiele werden durch diese Maske nicht verändert.
      </p>
    </PlanningEditorSection>
  );

  const teamsPanel = (
    <PlanningEditorSection testId="match-create-teams-section" ariaLabelledBy="match-create-teams-heading">
      <PlanningEditorSectionHeading id="match-create-teams-heading" title="Teams" />
      <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
        <label className="block space-y-2 md:col-span-2">
          <span className="fca-label">Eigenes Team</span>
          {teamOptions.length === 0 ? (
            <p className="text-sm text-amber-700">Kein Team mit Schreibzugriff verfügbar.</p>
          ) : (
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="fca-select"
              data-testid="match-create-team-select"
            >
              <option value="">— Auswählen —</option>
              {teamOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {formatTeamLabel(t)}
                </option>
              ))}
            </select>
          )}
        </label>
        <div className="md:col-span-2 space-y-2">
          <span className="fca-label">Heim / Auswärts (Sportsemantik)</span>
          <HomeAwaySegmentedControl value={homeAway} onChange={setHomeAway} testId="match-create-home-away" />
          <p className="text-xs text-[var(--text-2)]">
            {homeAway === "HOME"
              ? "Heimspiel — FC Allschwil ist Heim (links in der Identität)."
              : "Auswärtsspiel — FC Allschwil ist Auswärts (rechts in der Identität)."}
          </p>
        </div>
        <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
          <div className="block space-y-1">
            <span className="fca-label">Gegner (Vereinsverzeichnis)</span>
            <ExternalClubPicker
              selected={selectedExternalClub}
              onSelect={setSelectedExternalClub}
              onClearSelected={() => setSelectedExternalClub(null)}
              placeholder="Verein suchen…"
              testId="match-create-opponent-club-search"
            />
          </div>
          <label className="block space-y-1">
            <span className="fca-label">Anzeigename Gegner</span>
            <input
              type="text"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              className="fca-input"
              data-testid="match-create-opponent-name"
            />
          </label>
        </div>
      </div>
    </PlanningEditorSection>
  );

  const terminPanel = (
    <PlanningEditorSection testId="match-create-schedule-section" ariaLabelledBy="match-create-schedule-heading">
      <PlanningEditorSectionHeading id="match-create-schedule-heading" title="Termin" />
      <div className={PLANNING_EDITOR_FORM_GRID_CLASS}>
        <label className="block space-y-2">
          <span className="fca-label">Start</span>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="fca-input h-8 text-sm"
            data-testid="match-create-start-at"
          />
        </label>
        <label className="block space-y-2">
          <span className="fca-label">Ende</span>
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="fca-input h-8 text-sm"
            data-testid="match-create-end-at"
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="fca-label">
            {homeAway === "AWAY" ? "Ort (authoritative Auswärtsangabe)" : "Ort (optional)"}
          </span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="fca-input"
            placeholder={
              homeAway === "AWAY"
                ? "z. B. SV Sissach · Sportzentrum Tannenbrunn, Sissach - 2"
                : "z. B. Sportanlage Brüel"
            }
            data-testid="match-create-location"
          />
          {homeAway === "AWAY" ? (
            <span className="block text-xs text-[var(--text-2)]">
              Externe/Provider-Ortsstrings werden unverändert übernommen (inkl. Suffixe wie « - 2»).
            </span>
          ) : null}
        </label>
      </div>
    </PlanningEditorSection>
  );

  const ressourcenPanel =
    homeAway === "HOME" ? (
      <PlanningEditorSection testId="match-create-resources-section" ariaLabelledBy="match-create-resources-heading">
        <PlanningEditorSectionHeading id="match-create-resources-heading" title="Ressourcen" />
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PlanningResourceAssignmentKindIcon kind="pitch_hall" testId="match-create-pitch-kind-icon" />
              <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Spielfeld / Halle</p>
            </div>
            <PlanningSingleResourceAssignment
              kind="pitch_hall"
              showSubjectLabel={false}
              suppressKindIcon
              subjectLabel="Spielfeld / Halle"
              resourceName={
                pitchResourceId ? resolveResourceDisplay(pitchHallFacilityGroups, pitchResourceId) : null
              }
              unassignedLabel={tResources("unassignedPitchHall")}
              facilityGroups={pitchHallFacilityGroups}
              selectedResourceIds={new Set(pitchResourceId ? [pitchResourceId] : [])}
              onSelect={setPitchResourceId}
              onDeselect={() => setPitchResourceId(null)}
              availabilityByResourceId={pitchAvailability}
              canManage
              testId="match-create-pitch"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PlanningResourceAssignmentKindIcon kind="dressing_room" testId="match-create-dressing-kind-icon" />
              <p className={PLANNING_RESOURCE_SECTION_LABEL_CLASS}>Garderoben</p>
            </div>
            <PlanningMatchDressingRoomAssignments
              homeLabel={tResources("matchHomeSide")}
              awayLabel={tResources("matchAwaySide")}
              homeCode={homeDressingResourceId}
              awayCode={awayDressingResourceId}
              homeDisplayName={selectedTeam?.name ?? "Heim"}
              awayDisplayName={getEffectiveOpponentDisplayName() || "Gast"}
              canManage
              facilityGroups={dressingRoomFacilityGroups}
              dressingRoomAvailability={dressingRoomAvailability}
              onSelectHome={setHomeDressingResourceId}
              onSelectAway={setAwayDressingResourceId}
              onDeselectHome={() => setHomeDressingResourceId(null)}
              onDeselectAway={() => setAwayDressingResourceId(null)}
              testId="match-create-dressing-room"
            />
          </div>
        </div>
      </PlanningEditorSection>
    ) : (
      <PlanningEditorSection testId="match-create-resources-away-section" ariaLabelledBy="match-create-resources-away-heading">
        <PlanningEditorSectionHeading id="match-create-resources-away-heading" title="Ressourcen" />
        <p className="text-sm text-[var(--text-2)]">
          Auswärtsspiele nutzen keine FC-Allschwil-Anlagen — Ressourcen bleiben leer; der Ort steht unter Termin.
        </p>
      </PlanningEditorSection>
    );

  const spielbetriebPanel = (
    <PlanningEditorSection testId="match-create-spielbetrieb-section" ariaLabelledBy="match-create-spielbetrieb-heading">
      <PlanningEditorSectionHeading id="match-create-spielbetrieb-heading" title="Spielbetrieb" />
      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="fca-label">Wettbewerb (optional)</span>
          <input
            type="text"
            value={competitionLabel}
            onChange={(e) => setCompetitionLabel(e.target.value)}
            className="fca-input h-8 text-sm"
          />
        </label>
        <label className="block space-y-2">
          <span className="fca-label">Bemerkungen (optional)</span>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="fca-input min-h-[4rem] text-sm"
            rows={3}
          />
        </label>
        <div>
          <p className="fca-label mb-2">Ausspielung</p>
          <MatchPublicationToggles
            value={{
              websiteVisible,
              infoboardVisible,
              homepageVisible,
              wochenplanVisible,
              teamPageVisible,
            }}
            onChange={(patch) => {
              if (patch.websiteVisible !== undefined) setWebsiteVisible(patch.websiteVisible);
              if (patch.infoboardVisible !== undefined) setInfoboardVisible(patch.infoboardVisible);
              if (patch.homepageVisible !== undefined) setHomepageVisible(patch.homepageVisible);
              if (patch.wochenplanVisible !== undefined) setWochenplanVisible(patch.wochenplanVisible);
              if (patch.teamPageVisible !== undefined) setTeamPageVisible(patch.teamPageVisible);
            }}
            disabledChannelKeys={homeAway === "AWAY" ? ["infoboardVisible"] : []}
            testIdPrefix="match-create-publication"
          />
        </div>
      </div>
    </PlanningEditorSection>
  );

  definition.tabs = [
    { key: "uebersicht", label: "Übersicht", render: () => uebersichtPanel },
    { key: "teams", label: "Teams", render: () => teamsPanel },
    { key: "termin", label: "Termin", render: () => terminPanel },
    { key: "ressourcen", label: "Ressourcen", render: () => ressourcenPanel },
    { key: "spielbetrieb", label: "Spielbetrieb", render: () => spielbetriebPanel },
  ];

  return (
    <div data-testid="match-create-form">
      {reviewerComment ? (
        <div className="fca-status-box mb-3 border-amber-200 bg-amber-50 text-amber-900" data-testid="match-reviewer-comment">
          <p className="text-xs font-semibold uppercase tracking-wide">Rückmeldung Freigabe</p>
          <p className="mt-1 text-sm">{reviewerComment}</p>
        </div>
      ) : null}
      {loadError ? <div className="fca-status-box fca-status-box-error mb-3">{loadError}</div> : null}
      <SceActivityComposer
        key={resumeDraft?.draftId ?? "match-create-new"}
        definition={definition}
        containerMode={containerMode}
        open={open}
        onClose={onClose ?? (() => router.push("/dashboard/matchcenter"))}
        onSuccess={handleComposerSuccess}
        effectiveGovernance={effectiveGovernance}
        resumeDraft={resumeDraft}
        originContext={originContext}
        testId="match-create-composer"
      />
    </div>
  );
}
