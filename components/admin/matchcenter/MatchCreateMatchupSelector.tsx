"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { MatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { cn } from "@/lib/cn";
import type { MatchTeamOption } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import type { ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";
import { SceClubTeamSelectorDialog } from "@/components/sce/club-team-selector/SceClubTeamSelectorDialog";
import type { SceSelectableTeam } from "@/lib/sce/club-team-selector/types";

export type MatchCreateMatchupSelectorProps = {
  pair: MatchClubIdentityPair | null;
  homeAway: "HOME" | "AWAY";
  onHomeAwayChange: (value: "HOME" | "AWAY") => void;
  teamOptions: MatchTeamOption[];
  teamId: string;
  onTeamIdChange: (teamId: string) => void;
  formatTeamLabel: (team: MatchTeamOption) => string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
  selectedExternalClub: ExternalClubPickerResult | null;
  onSelectExternalClub: (club: ExternalClubPickerResult) => void;
  onClearExternalClub: () => void;
  opponentDisplayName: string;
  onOpponentDisplayNameChange: (value: string) => void;
  className?: string;
};

type SelectorKind = "own-team" | "opponent" | null;

function MatchupSideCard({
  side,
  identity,
  sideLabel,
  clubLabel,
  teamLabel,
  changeLabel,
  onChangeClick,
  changeButtonRef,
}: {
  side: "home" | "away";
  identity: MatchClubIdentityPair["homeClubIdentity"];
  sideLabel: string;
  clubLabel: string;
  teamLabel?: string | null;
  changeLabel: string;
  onChangeClick: () => void;
  changeButtonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-5 sm:px-5"
      data-sce-match-side={side}
      data-testid={`match-create-matchup-${side}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-2)]">
        {sideLabel}
      </p>
      <ClubCrest identity={identity} density="detail" decorative className="shrink-0" />
      <div className="min-w-0 w-full text-center">
        <p className="truncate text-base font-semibold text-[var(--foreground)] sm:text-lg">{clubLabel}</p>
        {teamLabel ? (
          <p className="mt-0.5 truncate text-xs text-[var(--text-2)]">{teamLabel}</p>
        ) : null}
      </div>
      <button
        ref={changeButtonRef}
        type="button"
        className="text-sm font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
        onClick={onChangeClick}
        data-testid={
          side === "home"
            ? changeLabel.includes("Gegner")
              ? "match-create-change-opponent-home"
              : "match-create-change-own-team"
            : changeLabel.includes("Gegner")
              ? "match-create-change-opponent-away"
              : "match-create-change-own-team-away"
        }
      >
        {changeLabel}
      </button>
    </div>
  );
}

export function MatchCreateMatchupSelector({
  pair,
  homeAway,
  onHomeAwayChange,
  teamOptions,
  teamId,
  onTeamIdChange,
  formatTeamLabel,
  tenantClubName,
  tenantLogoUrl,
  selectedExternalClub,
  onSelectExternalClub,
  onClearExternalClub,
  opponentDisplayName,
  onOpponentDisplayNameChange,
  className,
}: MatchCreateMatchupSelectorProps) {
  const [selectorKind, setSelectorKind] = useState<SelectorKind>(null);
  const ownTeamTriggerRef = useRef<HTMLButtonElement>(null);
  const opponentTriggerRef = useRef<HTMLButtonElement>(null);

  const tenantIsHome = homeAway === "HOME";
  const homeIdentity = pair?.homeClubIdentity;
  const awayIdentity = pair?.awayClubIdentity;

  const selectedTeam = useMemo(
    () => teamOptions.find((team) => team.id === teamId) ?? null,
    [teamId, teamOptions],
  );

  const tenantSelectableTeams = useMemo((): SceSelectableTeam[] => {
    return teamOptions.map((team) => ({
      id: team.id,
      clubId: "tenant",
      name: team.name,
      shortName: null,
      categoryLabel: [team.ageGroup, team.genderGroup].filter(Boolean).join(" / ") || null,
      ageGroup: team.ageGroup,
      genderGroup: team.genderGroup,
    }));
  }, [teamOptions]);

  const opponentClubLabel = selectedExternalClub?.name ?? (opponentDisplayName.trim() || "Gegner");
  const opponentTeamLabel =
    opponentDisplayName.trim() && opponentDisplayName.trim() !== opponentClubLabel
      ? opponentDisplayName.trim()
      : opponentDisplayName.trim() && !selectedExternalClub
        ? opponentDisplayName.trim()
        : opponentDisplayName.trim() || null;

  const tenantClubLabel = tenantClubName;
  const tenantTeamLabel = selectedTeam ? formatTeamLabel(selectedTeam) : null;

  function toggleHomeAway() {
    onHomeAwayChange(homeAway === "HOME" ? "AWAY" : "HOME");
  }

  function openOwnTeamSelector() {
    setSelectorKind("own-team");
  }

  function openOpponentSelector() {
    setSelectorKind("opponent");
  }

  const returnFocusRef =
    selectorKind === "own-team"
      ? ownTeamTriggerRef
      : selectorKind === "opponent"
        ? opponentTriggerRef
        : undefined;

  return (
    <div className={cn("space-y-4", className)} data-testid="match-create-matchup-selector">
      <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
        {homeIdentity ? (
          <MatchupSideCard
            side="home"
            identity={homeIdentity}
            sideLabel="Heim"
            clubLabel={tenantIsHome ? tenantClubLabel : opponentClubLabel}
            teamLabel={tenantIsHome ? tenantTeamLabel : opponentTeamLabel}
            changeLabel={tenantIsHome ? "Team ändern" : "Gegner ändern"}
            onChangeClick={tenantIsHome ? openOwnTeamSelector : openOpponentSelector}
            changeButtonRef={tenantIsHome ? ownTeamTriggerRef : opponentTriggerRef}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-8 text-sm text-[var(--text-2)]">
            Teams wählen
          </div>
        )}

        <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-2" aria-hidden={false}>
          <span
            className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]"
            data-testid="match-create-matchup-vs"
          >
            VS
          </span>
          <span className="sr-only">gegen</span>
        </div>

        {awayIdentity ? (
          <MatchupSideCard
            side="away"
            identity={awayIdentity}
            sideLabel="Auswärts"
            clubLabel={tenantIsHome ? opponentClubLabel : tenantClubLabel}
            teamLabel={tenantIsHome ? opponentTeamLabel : tenantTeamLabel}
            changeLabel={tenantIsHome ? "Gegner ändern" : "Team ändern"}
            onChangeClick={tenantIsHome ? openOpponentSelector : openOwnTeamSelector}
            changeButtonRef={tenantIsHome ? opponentTriggerRef : ownTeamTriggerRef}
          />
        ) : null}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={toggleHomeAway}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          data-testid="match-create-home-away-switch"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden />
          Heim/Auswärts wechseln
          <span className="sr-only">
            {homeAway === "HOME"
              ? "FC Allschwil spielt Heim links, Gegner Auswärts rechts"
              : "Gegner spielt Heim links, FC Allschwil Auswärts rechts"}
          </span>
        </button>
      </div>

      <SceClubTeamSelectorDialog
        open={selectorKind === "own-team"}
        onOpenChange={(next) => {
          if (!next) setSelectorKind(null);
        }}
        mode="TEAM_ONLY"
        tenantClub={{ clubName: tenantClubName, logoUrl: tenantLogoUrl }}
        tenantTeams={tenantSelectableTeams}
        filters={{ allowedTeamIds: teamOptions.map((t) => t.id), activeOnly: true }}
        onConfirm={({ team }) => {
          if (team) onTeamIdChange(team.id);
          setSelectorKind(null);
        }}
        testIdPrefix="match-create-own-team-selector"
        returnFocusRef={returnFocusRef}
      />

      <SceClubTeamSelectorDialog
        open={selectorKind === "opponent"}
        onOpenChange={(next) => {
          if (!next) setSelectorKind(null);
        }}
        mode="CLUB_THEN_TEAM"
        filters={{ activeOnly: true, externalClubsOnly: true }}
        onConfirm={({ club, team, manualTeamLabel }) => {
          if (club) {
            onSelectExternalClub({
              id: club.id,
              name: club.name,
              shortName: club.shortName,
              logoUrl: club.logoUrl,
            });
          } else {
            onClearExternalClub();
          }
          const label = team?.name ?? manualTeamLabel?.trim() ?? "";
          if (label) onOpponentDisplayNameChange(label);
          else if (club) onOpponentDisplayNameChange(club.name);
          setSelectorKind(null);
        }}
        testIdPrefix="match-create-opponent-selector"
        returnFocusRef={returnFocusRef}
      />
    </div>
  );
}
