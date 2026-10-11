"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";
import type { FacilityResourceOption } from "@/lib/facilities/resource-options";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import MatchcenterDetailOperational from "@/components/admin/matchcenter/MatchcenterDetailOperational";
import MatchEndTimeOperationalCallout from "@/components/admin/matchcenter/MatchEndTimeOperationalCallout";
import PlanningWorkflowBadge from "@/components/admin/shared/PlanningWorkflowBadge";
import PlanningWorkflowActionsClient from "@/components/admin/shared/PlanningWorkflowActionsClient";
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
import SpieleMatchRecordReadinessPill from "./SpieleMatchRecordReadinessPill";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import MatchPublicationToggles from "@/components/admin/matchcenter/MatchPublicationToggles";
import type { MatchOperationalActionsBinding } from "@/components/admin/matchcenter/MatchcenterDetailOperational";
import type { MatchcenterOperationalAssessment } from "@/lib/matchcenter/operational-state";
import { SceFeatureCard } from "@/components/sce/workspace/SceFeatureCard";
import { SCE_WORKSPACE_CARD_GRID_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";
import { getSceActivitySemanticIcon } from "@/lib/sce/workspace/sce-activity-semantic-icons";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

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
  lastChangedLabel: string;
  railStatusLabel: string;
  assessment: MatchcenterOperationalAssessment;
  wochenplanerHref: string;
  facilityLine: string | null;
  dressingLine: string | null;
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
  lastChangedLabel,
  railStatusLabel,
  assessment,
  wochenplanerHref,
  facilityLine,
  dressingLine,
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

  const publicationEditors = (
    <PlanningPublicationPanel testId="spiele-record-publication-panel">
      <MatchPublicationToggles
        value={publication}
        onChange={(patch) => onPublicationChange(patch)}
        disabled={!canManageMappings || saving}
        disabledChannelKeys={isAway ? ["infoboardVisible"] : []}
        testIdPrefix="spiele-record-publication"
        showHeading={false}
      />
    </PlanningPublicationPanel>
  );

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

        <div className={SCE_WORKSPACE_CARD_GRID_CLASS} data-testid="spiele-record-overview-grid">
          <SceFeatureCard
            title="Spielinformationen"
            description="Teams, Wettbewerb und betrieblicher Status."
            icon={getSceActivitySemanticIcon("matchInfo")}
            testId="spiele-record-section-overview"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <RecordField label="Heimteam" value={homeName} locked={isProtectedSource} testId="spiele-record-home" />
              <RecordField label="Gastteam" value={awayName} locked={isProtectedSource} testId="spiele-record-away" />
              <RecordField
                label="Wettbewerb"
                value={match.competitionLabel ?? "Nicht hinterlegt"}
                locked={isProtectedSource}
              />
              <RecordField
                label="Status"
                value={railStatusLabel}
                testId="spiele-record-overview-status"
              />
              <div className="sm:col-span-2">
                <SpieleMatchRecordReadinessPill assessment={assessment} homeAway={match.homeAway} />
              </div>
              {match.description ? (
                <div className="sm:col-span-2">
                  <RecordField label="Beschreibung" value={match.description} />
                </div>
              ) : null}
            </dl>
          </SceFeatureCard>

          <SceFeatureCard
            title="Termin & Ort"
            description="Anpfiff, Endzeit und Spielort."
            icon={getSceActivitySemanticIcon("schedule")}
            testId="spiele-record-section-schedule"
          >
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
              <RecordField
                label="Spielort"
                value={match.location ?? "Nicht hinterlegt"}
                locked={isProtectedSource}
              />
              {isHome && facilityLine ? (
                <RecordField label="Anlage" value={facilityLine} testId="spiele-record-facility" />
              ) : null}
              {isHome && dressingLine ? (
                <div className="sm:col-span-2">
                  <RecordField label="Garderoben" value={dressingLine} />
                </div>
              ) : null}
            </dl>
          </SceFeatureCard>
        </div>

        {isAway ? (
          <SceFeatureCard
            title="Matchvorbereitung"
            description="Auswärtsspiel — keine Heimvorbereitung."
            icon={getSceActivitySemanticIcon("location")}
            className="mt-3"
            testId="spiele-record-section-away"
          >
            <p className="text-sm text-[var(--text-2)]" data-testid="spiele-record-away-context">
              Auswärtsspiel — keine Heimkabinen- oder Spielfeldvorbereitung erforderlich.
              {match.location ? (
                <>
                  {" "}
                  Spielort: <span className="font-medium text-[var(--foreground)]">{match.location}</span>
                </>
              ) : null}
            </p>
          </SceFeatureCard>
        ) : null}

        {result || (match.scoreHome !== null && match.scoreAway !== null) ? (
          <SceFeatureCard
            title="Resultat"
            icon={getSceActivitySemanticIcon("operations")}
            className="mt-3"
            testId="spiele-record-section-result"
          >
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
          </SceFeatureCard>
        ) : null}
      </ActivityTabPanel>

      {matchSquadSection ? (
        <ActivityTabPanel tabKey="aufgebot" activeTab={activeTab}>
          {matchSquadSection}
        </ActivityTabPanel>
      ) : null}

      <ActivityTabPanel tabKey="teilnahme" activeTab={activeTab}>
        {match.status !== "CANCELLED" ? (
          <SceFeatureCard
            title="Teilnahme"
            description="Rückmeldungen und Fristen steuern."
            icon={getSceActivitySemanticIcon("participation")}
            testId="spiele-record-section-participation"
          >
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
          </SceFeatureCard>
        ) : null}
        {participantsSection}
      </ActivityTabPanel>

      <ActivityTabPanel tabKey="spielbetrieb" activeTab={activeTab}>
        <SceFeatureCard
          title="Spielbetrieb"
          description="Ressourcen, Zeiten und operative Steuerung."
          icon={getSceActivitySemanticIcon("operations")}
          testId="spiele-record-spielbetrieb-card"
          className="overflow-hidden p-0"
        >
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
        </SceFeatureCard>
      </ActivityTabPanel>

      <ActivityTabPanel tabKey="kommunikation" activeTab={activeTab}>
        {collaborationSection}
      </ActivityTabPanel>

      <ActivityTabPanel tabKey="mehr" activeTab={activeTab}>
        <div className={SCE_WORKSPACE_CARD_GRID_CLASS} data-testid="spiele-record-mehr-grid">
          <div className="md:col-span-2">{publicationEditors}</div>

          <div className="md:col-span-2">
            <PlanningEditorWorkSection
              headingId="spiele-record-work-heading"
              testId="spiele-record-work-section"
              persisted
              locale={locale}
              tasksPanel={relatedTasksPanel}
              requirementsPanel={relatedRequirementsPanel}
            />
          </div>

          <SceFeatureCard
            title="Technische Informationen"
            description="Quelle, Synchronisation und letzte Änderung."
            icon={getSceActivitySemanticIcon("settings")}
            testId="spiele-record-technical-summary"
          >
            <dl className="grid gap-3">
              <RecordField label="Quelle" value={sourceLabel} testId="spiele-record-source" />
              {isProtectedSource ? (
                <RecordField label="Synchronisation" value="SFV · synchronisiert" testId="spiele-record-sync" />
              ) : null}
              <RecordField
                label="Letzte Änderung"
                value={lastChangedLabel}
                testId="spiele-record-last-changed"
              />
            </dl>
            <SpieleMatchRecordTechnicalDetails match={match} locale={locale} timezone={timezone} />
          </SceFeatureCard>

          <SceFeatureCard
            title="Weitere Optionen"
            description="Planung und Wochenplaner."
            icon={getSceActivitySemanticIcon("planning")}
            testId="spiele-record-mehr-options"
          >
            <Link
              href={wochenplanerHref}
              className="fca-button-secondary inline-flex w-full items-center justify-center gap-1.5 text-sm"
              data-testid="spiele-record-rail-wochenplaner"
            >
              <ProductDomainSceIcon name="season" size={12} className="h-3.5 w-3.5" />
              Im Wochenplaner anzeigen
            </Link>
          </SceFeatureCard>
        </div>
      </ActivityTabPanel>
    </div>
  );
}
