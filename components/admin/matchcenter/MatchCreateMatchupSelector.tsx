"use client";

import { useId, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { MatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { cn } from "@/lib/cn";
import type { MatchTeamOption } from "@/lib/matchcenter/composer/load-match-composer-create-surface-props.server";
import { ExternalClubPicker, type ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";

export type MatchCreateMatchupSelectorProps = {
  pair: MatchClubIdentityPair | null;
  homeAway: "HOME" | "AWAY";
  onHomeAwayChange: (value: "HOME" | "AWAY") => void;
  teamOptions: MatchTeamOption[];
  teamId: string;
  onTeamIdChange: (teamId: string) => void;
  formatTeamLabel: (team: MatchTeamOption) => string;
  selectedExternalClub: ExternalClubPickerResult | null;
  onSelectExternalClub: (club: ExternalClubPickerResult) => void;
  onClearExternalClub: () => void;
  opponentDisplayName: string;
  onOpponentDisplayNameChange: (value: string) => void;
  className?: string;
};

function MatchupSideCard({
  side,
  identity,
  sideLabel,
  changeLabel,
  children,
}: {
  side: "home" | "away";
  identity: MatchClubIdentityPair["homeClubIdentity"];
  sideLabel: string;
  changeLabel: string;
  children: React.ReactNode;
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
        <p className="truncate text-base font-semibold text-[var(--foreground)] sm:text-lg">
          {identity.displayName}
        </p>
        {identity.shortName ? (
          <p className="mt-0.5 truncate text-xs text-[var(--text-2)]">{identity.shortName}</p>
        ) : null}
      </div>
      <div className="w-full min-w-0 space-y-2">
        <p className="text-center text-xs font-medium text-[var(--sce-primary)]">{changeLabel}</p>
        {children}
      </div>
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
  selectedExternalClub,
  onSelectExternalClub,
  onClearExternalClub,
  opponentDisplayName,
  onOpponentDisplayNameChange,
  className,
}: MatchCreateMatchupSelectorProps) {
  const [editingOwnTeam, setEditingOwnTeam] = useState(false);
  const [editingOpponent, setEditingOpponent] = useState(false);
  const opponentNameId = useId();

  const tenantIsHome = homeAway === "HOME";
  const homeIdentity = pair?.homeClubIdentity;
  const awayIdentity = pair?.awayClubIdentity;

  function toggleHomeAway() {
    onHomeAwayChange(homeAway === "HOME" ? "AWAY" : "HOME");
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="match-create-matchup-selector">
      <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
        {homeIdentity ? (
          <MatchupSideCard
            side="home"
            identity={homeIdentity}
            sideLabel="Heim"
            changeLabel={tenantIsHome ? "Team ändern" : "Gegner ändern"}
          >
            {tenantIsHome ? (
              editingOwnTeam || !teamId ? (
                <select
                  value={teamId}
                  onChange={(e) => {
                    onTeamIdChange(e.target.value);
                    setEditingOwnTeam(false);
                  }}
                  className="fca-select w-full text-sm"
                  data-testid="match-create-team-select"
                  autoFocus={editingOwnTeam}
                >
                  <option value="">— Auswählen —</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTeamLabel(t)}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  className="w-full text-sm text-[var(--text-2)] underline-offset-2 hover:underline"
                  onClick={() => setEditingOwnTeam(true)}
                  data-testid="match-create-change-own-team"
                >
                  Team ändern
                </button>
              )
            ) : editingOpponent ? (
              <div className="space-y-2">
                <ExternalClubPicker
                  selected={selectedExternalClub}
                  onSelect={(club) => {
                    onSelectExternalClub(club);
                    setEditingOpponent(false);
                  }}
                  onClearSelected={onClearExternalClub}
                  placeholder="Verein suchen…"
                  testId="match-create-opponent-club-search-home"
                  portalResults
                />
                <label className="block space-y-1 text-left">
                  <span className="sr-only">Anzeigename Gegner</span>
                  <input
                    id={opponentNameId}
                    type="text"
                    value={opponentDisplayName}
                    onChange={(e) => onOpponentDisplayNameChange(e.target.value)}
                    className="fca-input w-full text-sm"
                    data-testid="match-create-opponent-name"
                    placeholder="Anzeigename (optional)"
                  />
                </label>
              </div>
            ) : (
              <button
                type="button"
                className="w-full text-sm text-[var(--text-2)] underline-offset-2 hover:underline"
                onClick={() => setEditingOpponent(true)}
                data-testid="match-create-change-opponent-home"
              >
                Gegner ändern
              </button>
            )}
          </MatchupSideCard>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] p-8 text-sm text-[var(--text-2)]">
            Teams wählen
          </div>
        )}

        <div
          className="flex shrink-0 flex-col items-center justify-center gap-1 px-2"
          aria-hidden={false}
        >
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
            changeLabel={tenantIsHome ? "Gegner ändern" : "Team ändern"}
          >
            {tenantIsHome ? (
              editingOpponent ? (
                <div className="space-y-2">
                  <ExternalClubPicker
                    selected={selectedExternalClub}
                    onSelect={(club) => {
                      onSelectExternalClub(club);
                      setEditingOpponent(false);
                    }}
                    onClearSelected={onClearExternalClub}
                    placeholder="Verein suchen…"
                    testId="match-create-opponent-club-search-away"
                    portalResults
                  />
                  <label className="block space-y-1 text-left">
                    <span className="sr-only">Anzeigename Gegner</span>
                    <input
                      type="text"
                      value={opponentDisplayName}
                      onChange={(e) => onOpponentDisplayNameChange(e.target.value)}
                      className="fca-input w-full text-sm"
                      data-testid="match-create-opponent-name-away"
                      placeholder="Anzeigename (optional)"
                    />
                  </label>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full text-sm text-[var(--text-2)] underline-offset-2 hover:underline"
                  onClick={() => setEditingOpponent(true)}
                  data-testid="match-create-change-opponent-away"
                >
                  Gegner ändern
                </button>
              )
            ) : editingOwnTeam || !teamId ? (
              <select
                value={teamId}
                onChange={(e) => {
                  onTeamIdChange(e.target.value);
                  setEditingOwnTeam(false);
                }}
                className="fca-select w-full text-sm"
                data-testid="match-create-team-select-away"
                autoFocus={editingOwnTeam}
              >
                <option value="">— Auswählen —</option>
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatTeamLabel(t)}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                className="w-full text-sm text-[var(--text-2)] underline-offset-2 hover:underline"
                onClick={() => setEditingOwnTeam(true)}
                data-testid="match-create-change-own-team-away"
              >
                Team ändern
              </button>
            )}
          </MatchupSideCard>
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
    </div>
  );
}
