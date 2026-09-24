"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ParticipationRequestConfigEditor } from "@/components/admin/participation/ParticipationRequestConfigEditor";
import { Loader2, Lock, Radio } from "lucide-react";
import type { ReactNode } from "react";
import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";
import type { FacilityResourceOption } from "@/lib/facilities/resource-options";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { resolveClubIdentityLogoUrl } from "@/lib/matchcenter/club-identity";
import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import {
  getMatchcenterLifecycleClassification,
  getMatchcenterLifecycleLabel,
  getMatchcenterLifecycleVariant,
  getMatchcenterResultLabel,
} from "@/lib/matchcenter/match-lifecycle";
import { isMatchOperationallyActionable } from "@/lib/matchcenter/operational-state";
import { getEventEditability } from "@/lib/events/editability-rules";
import { matchRequiresEndTimeAction } from "@/lib/match/match-operational-completeness";
import MatchcenterDetailOperational, {
  type MatchOperationalActionsBinding,
} from "@/components/admin/matchcenter/MatchcenterDetailOperational";
import MatchEndTimeOperationalCallout from "@/components/admin/matchcenter/MatchEndTimeOperationalCallout";
import PlanningWorkflowBadge from "@/components/admin/shared/PlanningWorkflowBadge";
import PlanningWorkflowActionsClient from "@/components/admin/shared/PlanningWorkflowActionsClient";
import TrainingRecordSection from "@/components/admin/training/record/TrainingRecordSection";
import PlanningEditorWorkSection from "@/components/admin/shared/planning-editor/PlanningEditorWorkSection";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import {
  assessSpieleRecordOperationalState,
  formatSpieleRecordDate,
  formatSpieleRecordDateTimeLineForMatch,
  formatSpieleKickoffPresentation,
  formatSpieleOperationalEndPresentation,
  formatSpieleRecordTime,
  resolveHomeAwaySemanticLabel,
  resolveSpieleRecordLastChangedLabel,
  resolveSpieleRecordSourceLabel,
  resolveSpieleRecordStatusRailLabel,
  shouldShowSpieleRecordHeaderReadinessPill,
} from "@/lib/matchcenter/spiele-record-presentation";
import { formatOperationalHistoryLabel } from "@/lib/matchcenter/operational-history";
import SpieleRecordWorkspaceShell from "./SpieleRecordWorkspaceShell";
import SpieleMatchRecordContextRail from "./SpieleMatchRecordContextRail";
import SpieleMatchRecordContextMenu from "./SpieleMatchRecordContextMenu";
import SpieleMatchRecordDeleteDialog from "./SpieleMatchRecordDeleteDialog";
import SpieleMatchRecordReadinessPill from "./SpieleMatchRecordReadinessPill";
import SpieleMatchRecordTechnicalDetails from "./SpieleMatchRecordTechnicalDetails";
import { SPIELE_RECORD_WORKSPACE_SURFACE_CLASS } from "./spiele-record-layout";

export type SpieleMatchRecordWorkspaceProps = {
  match: MatchcenterMatchDetail;
  locale: string;
  timezone: string;
  canManageMappings: boolean;
  canDelete: boolean;
  pitchOptions: FacilityResourceOption[];
  dressingRoomOptions: FacilityResourceOption[];
  pitchHallFacilityGroups?: FacilityGroup[];
  dressingRoomFacilityGroups?: FacilityGroup[];
  canSubmitPlanning: boolean;
  canValidatePlanning: boolean;
  isProtectedSource: boolean;
  tenantLogoUrl?: string | null;
  wochenplanerHref: string;
  createTaskAction?: ReactNode;
  relatedTasksPanel?: ReactNode;
  participantsSection?: ReactNode;
  collaborationSection?: ReactNode;
};

function RecordField({
  label,
  value,
  locked,
  testId,
}: {
  label: string;
  value: string;
  locked?: boolean;
  testId?: string;
}) {
  return (
    <div className="space-y-0.5" data-testid={testId}>
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
        {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden /> : null}
        <span className="min-w-0 break-words">{value}</span>
        {locked ? (
          <span className="sr-only">Vom SFV synchronisiert, nicht editierbar</span>
        ) : null}
      </dd>
    </div>
  );
}

export default function SpieleMatchRecordWorkspace({
  match,
  locale,
  timezone,
  canManageMappings,
  canDelete,
  pitchOptions,
  dressingRoomOptions,
  pitchHallFacilityGroups,
  dressingRoomFacilityGroups,
  canSubmitPlanning,
  canValidatePlanning,
  isProtectedSource,
  tenantLogoUrl = null,
  wochenplanerHref,
  createTaskAction,
  relatedTasksPanel,
  participantsSection,
  collaborationSection,
}: SpieleMatchRecordWorkspaceProps) {
  const router = useRouter();
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const [saveUi, setSaveUi] = useState({ isDirty: false, saving: false });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const lifecycleClassification = getMatchcenterLifecycleClassification(match);
  const statusLabel = getMatchcenterLifecycleLabel(lifecycleClassification);
  const statusVariant = getMatchcenterLifecycleVariant(lifecycleClassification);
  const result = getMatchcenterResultLabel(match);
  const headlineResult = (() => {
    if (result) return result;
    const lifecycleCompleted =
      lifecycleClassification.lifecycle === "COMPLETED" || match.status === "COMPLETED";
    if (!lifecycleCompleted) return null;
    if (match.resultLabel?.trim()) return match.resultLabel.trim();
    if (match.scoreHome !== null && match.scoreAway !== null) {
      return `${match.scoreHome}:${match.scoreAway}`;
    }
    return null;
  })();
  const assessment = assessSpieleRecordOperationalState(match);
  const railStatusLabel = resolveSpieleRecordStatusRailLabel(match, assessment);

  const homeName = resolveMatchcenterCompactSideName(match.home);
  const awayName = resolveMatchcenterCompactSideName(match.away);
  const homeLogoUrl = resolveClubIdentityLogoUrl(match.home, tenantLogoUrl);
  const awayLogoUrl = resolveClubIdentityLogoUrl(match.away, tenantLogoUrl);
  const homeAwayLabel = resolveHomeAwaySemanticLabel(match.homeAway);
  const sourceLabel = resolveSpieleRecordSourceLabel(match);
  const lastChangedLabel = resolveSpieleRecordLastChangedLabel(match, locale, timezone);

  const scheduleEditability = getEventEditability({
    source: match.source.eventSource ?? "",
    eventType: "MATCH",
  });
  const operationallyActionable = isMatchOperationallyActionable(match);
  const requiresEndTimeAction =
    operationallyActionable && matchRequiresEndTimeAction(match);

  const matchDateIso = match.startAt.toISOString();
  const matchEndAtIso = match.endAt ? match.endAt.toISOString() : null;

  const facilityHistory = formatOperationalHistoryLabel(
    {
      pitchCode: match.operational.pitchCode,
      homeDressingRoomCode: match.operational.homeDressingRoomCode,
      awayDressingRoomCode: match.operational.awayDressingRoomCode,
    },
    { pitchOptions, dressingRoomOptions },
  );

  const onActionsBinding = useCallback((binding: MatchOperationalActionsBinding) => {
    saveActionRef.current = binding.save;
    setSaveUi((prev) =>
      prev.isDirty === binding.isDirty && prev.saving === binding.saving
        ? prev
        : { isDirty: binding.isDirty, saving: binding.saving },
    );
  }, []);

  const isDirty = saveUi.isDirty;
  const saving = saveUi.saving;

  const headerMetaLine = useMemo(() => {
    const parts: string[] = [];
    if (match.competitionLabel) parts.push(match.competitionLabel);
    parts.push(formatSpieleRecordDateTimeLineForMatch(match, locale, timezone));
    return parts.join(" · ");
  }, [match, locale, timezone]);

  const breadcrumbs = [
    { label: "Spiele", href: "/dashboard/matchcenter" },
    { label: homeName, href: undefined },
  ];

  const header = (
    <div className="flex flex-col gap-4 pt-1 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
          <span>Spiel</span>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <Badge variant={statusVariant} data-testid="matchcenter-detail-status">
            {lifecycleClassification.lifecycle === "LIVE" ? (
              <Radio className="h-3.5 w-3.5" aria-hidden />
            ) : null}
            {statusLabel}
          </Badge>
          <span className="text-[var(--muted)]" aria-hidden>
            ·
          </span>
          <span data-testid="spiele-record-source-chip">{sourceLabel}</span>
          {isProtectedSource ? (
            <>
              <span className="text-[var(--muted)]" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--muted)]">
                <Lock className="h-3 w-3" aria-hidden />
                SFV
              </span>
            </>
          ) : null}
          {isDirty ? (
            <>
              <span className="text-[var(--muted)]" aria-hidden>
                ·
              </span>
              <span className="text-[var(--sce-primary)]" data-testid="spiele-record-unsaved-hint">
                Ungespeicherte Änderungen
              </span>
            </>
          ) : null}
        </div>

        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4"
          data-testid="matchcenter-detail-hero"
        >
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <div className="min-w-0 text-right">
              <p
                className={cn(
                  "truncate text-base font-semibold sm:text-lg",
                  match.home.isOwnTeam && "font-bold text-[var(--foreground)]",
                )}
                data-testid="matchcenter-detail-home-team"
              >
                {homeName}
              </p>
            </div>
            <ClubLogo logoUrl={homeLogoUrl} name={homeName} size="lg" bare className="shrink-0" />
          </div>

          <div className="flex flex-col items-center justify-center px-1">
                {headlineResult ? (
                  <div
                    className="rounded-xl bg-[var(--foreground)] px-4 py-2 text-xl font-bold tabular-nums text-[var(--background)] sm:px-5 sm:text-2xl"
                    data-testid="matchcenter-detail-result"
                  >
                    {headlineResult}
                  </div>
            ) : (
              <span className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                vs
              </span>
            )}
            {match.intermediateResultLabel ? (
              <p className="mt-1 text-xs text-[var(--muted)]" data-testid="matchcenter-detail-intermediate-result">
                HZ {match.intermediateResultLabel}
              </p>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <ClubLogo logoUrl={awayLogoUrl} name={awayName} size="lg" bare className="shrink-0" />
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate text-base font-semibold sm:text-lg",
                  match.away.isOwnTeam && "font-bold text-[var(--foreground)]",
                )}
                data-testid="matchcenter-detail-away-team"
              >
                {awayName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-2)]">
          <span data-testid="matchcenter-detail-start">{headerMetaLine}</span>
          {match.location ? (
            <span className="text-[var(--text-2)]">{match.location}</span>
          ) : null}
          {homeAwayLabel ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                match.homeAway?.trim().toUpperCase() === "HOME"
                  ? "bg-sky-500/15 text-sky-200"
                  : "bg-[var(--surface-2)] text-[var(--muted)]",
              )}
              data-testid="matchcenter-detail-homeaway"
            >
              {homeAwayLabel}
            </span>
          ) : null}
          {shouldShowSpieleRecordHeaderReadinessPill(match.homeAway, assessment) ? (
            <SpieleMatchRecordReadinessPill
              assessment={assessment}
              homeAway={match.homeAway}
              className="normal-case"
            />
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <SpieleMatchRecordContextMenu
          wochenplanerHref={wochenplanerHref}
          createTaskAction={createTaskAction}
          canDelete={canDelete}
          onDeleteRequest={canDelete ? () => setDeleteOpen(true) : undefined}
        />
        {canManageMappings ? (
          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={() => void saveActionRef.current?.()}
            className={cn(
              "fca-button-primary inline-flex min-w-[7.5rem] items-center justify-center gap-2 text-sm disabled:opacity-50",
              isDirty && "ring-2 ring-[var(--sce-primary)]/35",
            )}
            data-testid="spiele-record-save"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Speichern
          </button>
        ) : null}
      </div>
    </div>
  );

  const isHome = match.homeAway?.trim().toUpperCase() === "HOME";
  const isAway = match.homeAway?.trim().toUpperCase() === "AWAY";

  return (
    <>
      <SpieleRecordWorkspaceShell
        breadcrumbs={breadcrumbs}
        header={header}
        testId="spiele-match-record-workspace"
        contextRail={
          <div className="space-y-4">
            <SpieleMatchRecordContextRail
              statusLabel={railStatusLabel}
              assessment={assessment}
              homeAway={match.homeAway}
              homeName={homeName}
              awayName={awayName}
              scheduleLine={formatSpieleRecordDate(match.startAt, locale, timezone)}
              kickoffTime={formatSpieleKickoffPresentation(match, locale, timezone)}
              facilityLine={
                isHome && match.operational.pitchCode
                  ? pitchOptions.find((o) => o.code === match.operational.pitchCode)?.name ??
                    match.operational.pitchCode
                  : null
              }
              dressingLine={isHome ? facilityHistory : null}
              sourceLabel={sourceLabel}
              isProtectedSource={isProtectedSource}
              lastChangedLabel={lastChangedLabel}
              wochenplanerHref={wochenplanerHref}
            />
          </div>
        }
      >
        <MatchEndTimeOperationalCallout
          matchId={match.id}
          requiresEndTimeAction={requiresEndTimeAction}
          canManage={canManageMappings}
          canReschedule={scheduleEditability.canReschedule}
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
            matchDateIso={matchDateIso}
            matchEndAtIso={matchEndAtIso}
            canManage={canManageMappings}
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
                value={
                  formatSpieleOperationalEndPresentation(match, locale, timezone) ?? "—"
                }
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

          {match.status !== "CANCELLED" ? (
            <TrainingRecordSection title="Teilnahme" testId="spiele-record-section-participation">
              <ParticipationRequestConfigEditor
                apiPath={`/api/matchcenter/${match.id}/participation-request`}
                timeZone={timezone}
                disabled={!canManageMappings}
                values={{
                  participationResponseDueAt:
                    match.participationResponseDueAt?.toISOString() ?? null,
                  participationReminder1At:
                    match.participationReminder1At?.toISOString() ?? null,
                  participationReminder2At:
                    match.participationReminder2At?.toISOString() ?? null,
                  participationReminder1PresetKey: match.participationReminder1PresetKey,
                  participationReminder2PresetKey: match.participationReminder2PresetKey,
                }}
                onSaved={() => router.refresh()}
              />
            </TrainingRecordSection>
          ) : null}

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

          {result ||
          (match.scoreHome !== null && match.scoreAway !== null) ? (
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

        {participantsSection}

        <PlanningEditorWorkSection
          headingId="spiele-record-work-heading"
          testId="spiele-record-work-section"
          persisted
          locale={locale}
          tasksPanel={relatedTasksPanel}
        />

        {collaborationSection}

        <SpieleMatchRecordTechnicalDetails match={match} locale={locale} timezone={timezone} />
      </SpieleRecordWorkspaceShell>

      {canDelete ? (
        <SpieleMatchRecordDeleteDialog
          matchId={match.id}
          matchTitle={match.title}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
        />
      ) : null}
    </>
  );
}
