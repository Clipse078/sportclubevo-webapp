"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";
import type { FacilityResourceOption } from "@/lib/facilities/resource-options";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import MatchcenterDetailOperational from "@/components/admin/matchcenter/MatchcenterDetailOperational";
import MatchEndTimeOperationalCallout from "@/components/admin/matchcenter/MatchEndTimeOperationalCallout";
import PlanningWorkflowBadge from "@/components/admin/shared/PlanningWorkflowBadge";
import PlanningWorkflowActionsClient from "@/components/admin/shared/PlanningWorkflowActionsClient";
import TrainingRecordSection from "@/components/admin/training/record/TrainingRecordSection";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import ActivityTabPanel from "@/lib/activity-navigation/ActivityTabPanel";
import { useActivityDetailTab } from "@/lib/activity-navigation/use-activity-detail-tab";
import { useActivityDirtyNavigation } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import {
  formatSpieleRecordDate,
  formatSpieleKickoffPresentation,
  formatSpieleOperationalEndPresentation,
  formatSpieleRecordTime,
} from "@/lib/matchcenter/spiele-record-presentation";
import SpieleMatchRecordTechnicalDetails from "./SpieleMatchRecordTechnicalDetails";
import { SPIELE_RECORD_WORKSPACE_SURFACE_CLASS } from "./spiele-record-layout";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import MatchPublicationToggles from "@/components/admin/matchcenter/MatchPublicationToggles";
import type { MatchOperationalActionsBinding } from "@/components/admin/matchcenter/MatchcenterDetailOperational";

type RecordFieldProps = {
  label: string;
  value: string;
  locked?: boolean;
  testId?: string;
};

function RecordField({ label, value, locked, testId }: RecordFieldProps) {
  return (
    <div className="space-y-0.5" data-testid={testId}>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
        {locked ? (
          <span className="sr-only">Vom SFV synchronisiert, nicht editierbar</span>
        ) : null}
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}

export type SpieleMatchRecordTabPanelsProps = {
  match: MatchcenterMatchDetail;
  locale: string;
  timezone: string;
  homeName: string;
  awayName: string;
  sourceLabel: string;
  isProtectedSource: boolean;
  canManageMappings: boolean;
  canManageOperationalAllocations: boolean;
  canValidatePlanning: boolean;
  operationallyActionable: boolean;
  requiresEndTimeAction: boolean;
  scheduleEditabilityCanReschedule: boolean;
  pitchOptions: FacilityResourceOption[];
  dressingRoomOptions: FacilityResourceOption[];
  pitchHallFacilityGroups?: FacilityGroup[];
  dressingRoomFacilityGroups?: FacilityGroup[];
  matchDateIso: string;
  matchEndAtIso: string | null;
  publication: {
    websiteVisible: boolean;
    infoboardVisible: boolean;
    homepageVisible: boolean;
    wochenplanVisible: boolean;
    teamPageVisible: boolean;
  };
  onPublicationChange: (patch: Partial<SpieleMatchRecordTabPanelsProps["publication"]>) => void;
  saving: boolean;
  isDirty: boolean;
  onActionsBinding: (binding: MatchOperationalActionsBinding) => void;
  isHome: boolean;
  isAway: boolean;
  result: string | null;
  participantsSection?: ReactNode;
  matchSquadSection?: ReactNode;
  collaborationSection?: ReactNode;
  relatedTasksPanel?: ReactNode;
  relatedRequirementsPanel?: ReactNode;
};

export default function SpieleMatchRecordTabPanels({
  match,
  locale,
  timezone,
  homeName,
  awayName,
  sourceLabel,
  isProtectedSource,
  canManageMappings,
  canManageOperationalAllocations,
  canValidatePlanning,
  operationallyActionable,
  requiresEndTimeAction,
  scheduleEditabilityCanReschedule,
  pitchOptions,
  dressingRoomOptions,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  matchDateIso,
  matchEndAtIso,
  publication,
  onPublicationChange,
  saving,
  isDirty,
  onActionsBinding,
  isHome,
  isAway,
  result,
  participantsSection,
  matchSquadSection,
  collaborationSection,
  relatedTasksPanel,
  relatedRequirementsPanel,
}: SpieleMatchRecordTabPanelsProps) {
  const router = useRouter();
  const { activeTab } = useActivityDetailTab();
  const dirtyNav = useActivityDirtyNavigation();

  useEffect(() => {
    dirtyNav.setDirty(isDirty);
    return () => dirtyNav.setDirty(false);
  }, [dirtyNav, isDirty]);

  return (
    <div className="space-y-4" data-testid="match-activity-tab-panels">
      <ActivityTabPanel tabKey="uebersicht" activeTab={activeTab}>
        <MatchEndTimeOperationalCallout
          matchId={match.id}
          requiresEndTimeAction={requiresEndTimeAction}
          canManage={canManageMappings}
          canReschedule={scheduleEditabilityCanReschedule}
        />

        {!isProtectedSource ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--muted)]">Planungsstatus</span>
              <PlanningWorkflowBadge stage={match.reviewStage} size="sm" />
            </div>
            <PlanningWorkflowActionsClient
              recordId={match.id}
              domain="match"
              planningStage={match.reviewStage}
              isCoordinator={canValidatePlanning}
              isProtectedSource={isProtectedSource}
            />
          </div>
        ) : null}

        <div className={`${SPIELE_RECORD_WORKSPACE_SURFACE_CLASS} divide-y divide-[var(--border)]/80`}>
          <TrainingRecordSection title="Übersicht" testId="spiele-record-section-overview">
            <dl className="grid gap-4 sm:grid-cols-2">
              <RecordField label="Heimteam" value={homeName} locked={isProtectedSource} testId="spiele-record-home" />
              <RecordField label="Gastteam" value={awayName} locked={isProtectedSource} testId="spiele-record-away" />
              <RecordField
                label="Wettbewerb"
                value={match.competitionLabel ?? "Nicht hinterlegt"}
                locked={isProtectedSource}
              />
              <RecordField label="Spielort" value={match.location ?? "Nicht hinterlegt"} locked={isProtectedSource} />
              <RecordField label="Quelle" value={sourceLabel} testId="spiele-record-source" />
              {match.description ? (
                <div className="sm:col-span-2">
                  <RecordField label="Beschreibung" value={match.description} />
                </div>
              ) : null}
            </dl>
          </TrainingRecordSection>

          <TrainingRecordSection title="Spieltermin" testId="spiele-record-section-schedule">
            <dl className="grid gap-4 sm:grid-cols-2">
              <RecordField
                label="Datum"
                value={formatSpieleRecordDate(match.startAt, locale, timezone)}
                locked={isProtectedSource}
              />
              <RecordField
                label="Anpfiff"
                value={formatSpieleKickoffPresentation(match, locale, timezone)}
                locked={isProtectedSource}
                testId="spiele-record-kickoff"
              />
              <RecordField
                label="Ende (betrieblich)"
                value={formatSpieleOperationalEndPresentation(match, locale, timezone) ?? "—"}
              />
              {match.endAt ? (
                <RecordField
                  label="Ende (Provider)"
                  value={formatSpieleRecordTime(match.endAt, locale, timezone)}
                  locked={isProtectedSource}
                />
              ) : null}
            </dl>
          </TrainingRecordSection>

          {isAway ? (
            <TrainingRecordSection title="Matchvorbereitung" testId="spiele-record-section-away">
              <p className="text-sm text-[var(--text-2)]" data-testid="spiele-record-away-context">
                Auswärtsspiel — keine Heimkabinen- oder Spielfeldvorbereitung erforderlich.
                {match.location ? (
                  <>
                    {" "}
                    Spielort: <span className="font-medium text-[var(--foreground)]">{match.location}</span>
                  </>
                ) : null}
              </p>
            </TrainingRecordSection>
          ) : null}

          {result || (match.scoreHome !== null && match.scoreAway !== null) ? (
            <TrainingRecordSection title="Resultat" testId="spiele-record-section-result">
              <div
                className="flex flex-wrap items-center gap-4 text-sm"
                data-testid="spiele-record-result-display"
              >
                <div className="min-w-[8rem] font-medium text-[var(--foreground)]">{homeName}</div>
                <div className="text-lg font-bold tabular-nums">{match.scoreHome ?? "–"}</div>
                <div className="min-w-[8rem] font-medium text-[var(--foreground)]">{awayName}</div>
                <div className="text-lg font-bold tabular-nums">{match.scoreAway ?? "–"}</div>
                {isProtectedSource ? (
                  <p className="w-full text-xs text-[var(--muted)]">
                    Resultat vom SFV synchronisiert — nicht manuell editierbar.
                  </p>
                ) : null}
              </div>
            </TrainingRecordSection>
          ) : null}
        </div>
      </ActivityTabPanel>

      {matchSquadSection ? (
        <ActivityTabPanel tabKey="aufgebot" activeTab={activeTab}>
          {matchSquadSection}
        </ActivityTabPanel>
      ) : null}

      <ActivityTabPanel tabKey="teilnahme" activeTab={activeTab}>
        {match.status !== "CANCELLED" ? (
          <TrainingRecordSection title="Teilnahme" testId="spiele-record-section-participation">
            <ParticipationRequestConfigEditor
              apiPath={`/api/matchcenter/${match.id}/participation-request`}
              timeZone={timezone}
              disabled={!canManageMappings}
              values={{
                participationResponseDueAt: match.participationResponseDueAt?.toISOString() ?? null,
                participationReminder1At: match.participationReminder1At?.toISOString() ?? null,
                participationReminder2At: match.participationReminder2At?.toISOString() ?? null,
                participationReminder1PresetKey: match.participationReminder1PresetKey,
                participationReminder2PresetKey: match.participationReminder2PresetKey,
              }}
              onSaved={() => router.refresh()}
            />
          </TrainingRecordSection>
        ) : null}
        {participantsSection}
      </ActivityTabPanel>

      <ActivityTabPanel tabKey="spielbetrieb" activeTab={activeTab}>
        <div className={SPIELE_RECORD_WORKSPACE_SURFACE_CLASS}>
          <MatchcenterDetailOperational
            matchId={match.id}
            homeAway={match.homeAway}
            homeDisplayName={match.home.displayName}
            awayDisplayName={match.away.displayName}
            homeIsOwnTeam={match.home.isOwnTeam}
            awayIsOwnTeam={match.away.isOwnTeam}
            currentTeamId={match.teamId}
            currentPitchCode={match.operational.pitchCode}
            currentHomeDressingRoomCode={match.operational.homeDressingRoomCode}
            currentAwayDressingRoomCode={match.operational.awayDressingRoomCode}
            currentWebsiteVisible={match.visibility.websiteVisible}
            currentInfoboardVisible={match.visibility.infoboardVisible}
            currentWochenplanVisible={match.visibility.wochenplanVisible}
            currentHomepageVisible={match.visibility.homepageVisible}
            currentTeamPageVisible={match.visibility.teamPageVisible}
            publicationValues={publication}
            onPublicationChange={(patch) => onPublicationChange(patch)}
            suppressPublicationUI
            matchDateIso={matchDateIso}
            matchEndAtIso={matchEndAtIso}
            canManage={canManageOperationalAllocations}
            pitchOptions={pitchOptions}
            dressingRoomOptions={dressingRoomOptions}
            pitchHallFacilityGroups={pitchHallFacilityGroups}
            dressingRoomFacilityGroups={dressingRoomFacilityGroups}
            isOperationallyActionable={operationallyActionable}
            assessmentBase={match}
            layout="record"
            hideFooterActions
            onActionsBinding={onActionsBinding}
          />
        </div>
      </ActivityTabPanel>

      <ActivityTabPanel tabKey="kommunikation" activeTab={activeTab}>
        {collaborationSection}
      </ActivityTabPanel>

      <ActivityTabPanel tabKey="mehr" activeTab={activeTab}>
        <div className="space-y-4">
          <PlanningPublicationPanel testId="spiele-record-publication-panel-mehr">
            <MatchPublicationToggles
              value={publication}
              onChange={(patch) => onPublicationChange(patch)}
              disabled={!canManageMappings || saving}
              disabledChannelKeys={isAway ? ["infoboardVisible"] : []}
              testIdPrefix="spiele-record-publication"
            />
          </PlanningPublicationPanel>

          <PlanningEditorWorkSection
            headingId="spiele-record-work-heading"
            testId="spiele-record-work-section"
            persisted
            locale={locale}
            tasksPanel={relatedTasksPanel}
            requirementsPanel={relatedRequirementsPanel}
          />

          <SpieleMatchRecordTechnicalDetails match={match} locale={locale} timezone={timezone} />
        </div>
      </ActivityTabPanel>
    </div>
  );
}
