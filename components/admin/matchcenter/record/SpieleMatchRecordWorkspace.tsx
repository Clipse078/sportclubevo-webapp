"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { MatchOperationalActionsBinding } from "@/components/admin/matchcenter/MatchcenterDetailOperational";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import {
  assessSpieleRecordOperationalState,
  formatSpieleRecordDateTimeLineForMatch,
  resolveHomeAwaySemanticLabel,
  resolveSpieleRecordLastChangedLabel,
  resolveSpieleRecordSourceLabel,
  resolveSpieleRecordStatusRailLabel,
  shouldShowSpieleRecordHeaderReadinessPill,
} from "@/lib/matchcenter/spiele-record-presentation";
import { formatOperationalHistoryLabel } from "@/lib/matchcenter/operational-history";
import SpieleRecordWorkspaceShell from "./SpieleRecordWorkspaceShell";
import SpieleMatchRecordContextMenu from "./SpieleMatchRecordContextMenu";
import SpieleMatchRecordDeleteDialog from "./SpieleMatchRecordDeleteDialog";
import SpieleMatchRecordReadinessPill from "./SpieleMatchRecordReadinessPill";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import { SceContextDirtyGuardProvider } from "@/lib/context-tabs";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import SpieleMatchRecordTabPanels from "./SpieleMatchRecordTabPanels";

export type SpieleMatchRecordWorkspaceProps = {
  match: MatchcenterMatchDetail;
  locale: string;
  timezone: string;
  canManageMappings: boolean;
  canManageOperationalAllocations?: boolean;
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
  relatedRequirementsPanel?: ReactNode;
  participantsSection?: ReactNode;
  matchSquadSection?: ReactNode;
  collaborationSection?: ReactNode;
};

export default function SpieleMatchRecordWorkspace({
  match,
  locale,
  timezone,
  canManageMappings,
  canManageOperationalAllocations: canManageOperationalAllocationsProp,
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
  relatedRequirementsPanel,
  participantsSection,
  matchSquadSection,
  collaborationSection,
}: SpieleMatchRecordWorkspaceProps) {
  const canManageOperationalAllocations =
    canManageOperationalAllocationsProp ?? canManageMappings;
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const [saveUi, setSaveUi] = useState({ isDirty: false, saving: false });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [publication, setPublication] = useState({
    websiteVisible: match.visibility.websiteVisible,
    infoboardVisible: match.visibility.infoboardVisible,
    homepageVisible: match.visibility.homepageVisible,
    wochenplanVisible: match.visibility.wochenplanVisible,
    teamPageVisible: match.visibility.teamPageVisible,
  });

  const publicationSyncKey = [
    match.id,
    match.visibility.websiteVisible,
    match.visibility.infoboardVisible,
    match.visibility.homepageVisible,
    match.visibility.wochenplanVisible,
    match.visibility.teamPageVisible,
  ].join(":");

  useEffect(() => {
    // Resync draft publication state after server refresh (post-save) without remounting the workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional server→client reconciliation
    setPublication({
      websiteVisible: match.visibility.websiteVisible,
      infoboardVisible: match.visibility.infoboardVisible,
      homepageVisible: match.visibility.homepageVisible,
      wochenplanVisible: match.visibility.wochenplanVisible,
      teamPageVisible: match.visibility.teamPageVisible,
    });
  }, [publicationSyncKey, match.visibility]);

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
        {canManageOperationalAllocations ? (
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

  const activityNavConfig = buildActivityTabNavigationConfig({
    kind: "MATCH",
    matchSquadAvailable: Boolean(matchSquadSection),
    participationAvailable:
      match.status !== "CANCELLED" || Boolean(participantsSection),
  });

  return (
    <>
      <SpieleRecordWorkspaceShell
        breadcrumbs={breadcrumbs}
        header={header}
        testId="spiele-match-record-workspace"
      >
        <SceContextDirtyGuardProvider>
          <SceContextTabsBoundary
            config={activityNavConfig}
            ariaLabel="Spiel"
            testId="match-activity-nav"
            idPrefix="activity-tab"
          >
            <SpieleMatchRecordTabPanels
              match={match}
              locale={locale}
              timezone={timezone}
              homeName={homeName}
              awayName={awayName}
              sourceLabel={sourceLabel}
              lastChangedLabel={lastChangedLabel}
              railStatusLabel={railStatusLabel}
              assessment={assessment}
              wochenplanerHref={wochenplanerHref}
              facilityLine={
                isHome && match.operational.pitchCode
                  ? pitchOptions.find((o) => o.code === match.operational.pitchCode)?.name ??
                    match.operational.pitchCode
                  : null
              }
              dressingLine={isHome ? facilityHistory : null}
              isProtectedSource={isProtectedSource}
              canManageMappings={canManageMappings}
              canManageOperationalAllocations={canManageOperationalAllocations}
              canValidatePlanning={canValidatePlanning}
              operationallyActionable={operationallyActionable}
              requiresEndTimeAction={requiresEndTimeAction}
              scheduleEditabilityCanReschedule={scheduleEditability.canReschedule}
              pitchOptions={pitchOptions}
              dressingRoomOptions={dressingRoomOptions}
              pitchHallFacilityGroups={pitchHallFacilityGroups}
              dressingRoomFacilityGroups={dressingRoomFacilityGroups}
              matchDateIso={matchDateIso}
              matchEndAtIso={matchEndAtIso}
              publication={publication}
              onPublicationChange={(patch) => setPublication((prev) => ({ ...prev, ...patch }))}
              saving={saving}
              isDirty={isDirty}
              onActionsBinding={onActionsBinding}
              isHome={isHome}
              isAway={isAway}
              result={result}
              participantsSection={participantsSection}
              matchSquadSection={matchSquadSection}
              collaborationSection={collaborationSection}
              relatedTasksPanel={relatedTasksPanel}
              relatedRequirementsPanel={relatedRequirementsPanel}
            />
          </SceContextTabsBoundary>
        </SceContextDirtyGuardProvider>
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
