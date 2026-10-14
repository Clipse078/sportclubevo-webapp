"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import {
  fetchAllSelectableClubs,
  fetchSelectableTeamsForClub,
} from "@/lib/sce/club-team-selector/club-team-selector-client";
import {
  filterSelectableClubsBySearch,
  filterSelectableTeamsBySearch,
  sortSelectableClubsDeterministic,
} from "@/lib/sce/club-team-selector/club-search";
import { applyClubSelectorFilters, applyTeamSelectorFilters } from "@/lib/sce/club-team-selector/apply-selector-filters";
import type {
  SceClubTeamSelectionResult,
  SceClubTeamSelectorFilters,
  SceClubTeamSelectorMode,
  SceSelectableClub,
  SceSelectableTeam,
  SceTenantClubContext,
} from "@/lib/sce/club-team-selector/types";
import { SceClubGrid } from "./SceClubGrid";
import { SceClubTeamSearch } from "./SceClubTeamSearch";
import { SceTeamList } from "./SceTeamList";

export type SceClubTeamSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SceClubTeamSelectorMode;
  filters?: SceClubTeamSelectorFilters;
  tenantClub?: SceTenantClubContext | null;
  /** Preloaded tenant teams for TEAM_ONLY mode (Match own team). */
  tenantTeams?: readonly SceSelectableTeam[];
  title?: string;
  onConfirm: (result: SceClubTeamSelectionResult) => void;
  testIdPrefix?: string;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

type ViewPhase = "clubs" | "teams" | "manual-team";

export function SceClubTeamSelectorDialog({
  open,
  onOpenChange,
  mode,
  filters,
  tenantClub,
  tenantTeams = [],
  title,
  onConfirm,
  testIdPrefix = "sce-club-team-selector",
  returnFocusRef,
}: SceClubTeamSelectorDialogProps) {
  const searchInputId = useId();
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<SceSelectableClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsError, setClubsError] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<SceSelectableClub | null>(null);
  const [teams, setTeams] = useState<SceSelectableTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [manualTeamLabel, setManualTeamLabel] = useState("");
  const [phase, setPhase] = useState<ViewPhase>("clubs");

  const abortRef = useRef<AbortController | null>(null);

  const resolvedTitle =
    title ??
    (mode === "TEAM_ONLY"
      ? "Team auswählen"
      : phase === "teams"
        ? "Team auswählen"
        : "Verein auswählen");

  const resetState = useCallback(() => {
    setSearch("");
    setSelectedClub(null);
    setTeams([]);
    setManualTeamLabel("");
    setClubsError(null);
    setTeamsError(null);
    setPhase(mode === "TEAM_ONLY" ? "teams" : "clubs");
  }, [mode]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!open || mode === "TEAM_ONLY") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setClubsLoading(true);
    setClubsError(null);

    fetchAllSelectableClubs({ signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setClubs(applyClubSelectorFilters(loaded, filters));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setClubsError(err instanceof Error ? err.message : "Vereine konnten nicht geladen werden.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setClubsLoading(false);
      });

    return () => controller.abort();
  }, [open, mode]);

  const visibleClubs = useMemo(() => {
    const filtered = filterSelectableClubsBySearch(clubs, search);
    return sortSelectableClubsDeterministic(filtered);
  }, [clubs, search]);

  const visibleTenantTeams = useMemo(() => {
    const filtered = applyTeamSelectorFilters(tenantTeams, filters);
    return filterSelectableTeamsBySearch(filtered, search);
  }, [tenantTeams, filters, search]);

  const visibleExternalTeams = useMemo(() => {
    return filterSelectableTeamsBySearch(teams, search);
  }, [teams, search]);

  function closeAndRestoreFocus() {
    onOpenChange(false);
    if (returnFocusRef?.current) {
      returnFocusRef.current.focus({ preventScroll: true });
    }
  }

  function handleClose() {
    closeAndRestoreFocus();
  }

  function completeSelection(result: SceClubTeamSelectionResult) {
    onConfirm(result);
    closeAndRestoreFocus();
  }

  function loadTeamsForClub(club: SceSelectableClub) {
    setSelectedClub(club);
    setPhase("teams");
    setSearch("");
    setTeamsLoading(true);
    setTeamsError(null);

    fetchSelectableTeamsForClub({ clubId: club.id })
      .then((loaded) => {
        const eligible = applyTeamSelectorFilters(loaded, filters);
        setTeams(eligible);
        if (eligible.length === 0) {
          setPhase("manual-team");
        }
      })
      .catch((err: unknown) => {
        setTeamsError(err instanceof Error ? err.message : "Teams konnten nicht geladen werden.");
      })
      .finally(() => setTeamsLoading(false));
  }

  function handleClubPick(club: SceSelectableClub) {
    if (mode === "CLUB_ONLY") {
      completeSelection({ club, team: null });
      return;
    }
    loadTeamsForClub(club);
  }

  function handleTeamPick(team: SceSelectableTeam) {
    if (mode === "TEAM_ONLY") {
      completeSelection({
        club: tenantClub
          ? {
              id: tenantClub.clubId ?? "tenant",
              name: tenantClub.clubName,
              shortName: null,
              alternativeName: null,
              logoUrl: tenantClub.logoUrl,
              status: "active",
              teamCount: tenantTeams.length,
            }
          : null,
        team,
      });
      return;
    }
    completeSelection({ club: selectedClub, team });
  }

  function handleManualTeamConfirm() {
    const label = manualTeamLabel.trim();
    if (!selectedClub || !label) return;
    completeSelection({ club: selectedClub, team: null, manualTeamLabel: label });
  }

  const searchPlaceholder =
    phase === "teams" || mode === "TEAM_ONLY" ? "Team suchen…" : "Verein oder Team suchen…";

  const body = (() => {
    if (mode === "TEAM_ONLY") {
      if (tenantClub) {
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 border-b border-[var(--border)] pb-4">
              <ClubLogo
                logoUrl={tenantClub.logoUrl}
                name={tenantClub.clubName}
                size="xl"
                bare
                decorative
              />
              <p className="text-center text-lg font-semibold text-[var(--foreground)]">
                {tenantClub.clubName}
              </p>
            </div>
            <SceClubTeamSearch
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
              testId={`${testIdPrefix}-search`}
            />
            {visibleTenantTeams.length === 0 ? (
              <p className="text-sm text-[var(--text-2)]" data-testid={`${testIdPrefix}-empty-teams`}>
                {search.trim()
                  ? `Keine Teams für «${search.trim()}» gefunden.`
                  : "Keine Teams verfügbar."}
              </p>
            ) : (
              <SceTeamList
                teams={visibleTenantTeams}
                onSelectTeam={handleTeamPick}
                testId={`${testIdPrefix}-tenant-teams`}
              />
            )}
          </div>
        );
      }
    }

    if (phase === "clubs") {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <SceClubTeamSearch
            value={search}
            onChange={setSearch}
            placeholder={searchPlaceholder}
            testId={`${testIdPrefix}-search`}
          />
          <p className="text-xs text-[var(--text-2)]" aria-live="polite">
            {clubsLoading
              ? "Vereine werden geladen…"
              : `${visibleClubs.length} Verein${visibleClubs.length === 1 ? "" : "e"} sichtbar`}
          </p>
          {clubsLoading ? (
            <SceClubGrid.Skeleton />
          ) : clubsError ? (
            <div className="space-y-3 rounded-lg border border-[var(--border)] p-4" data-testid={`${testIdPrefix}-error`}>
              <p className="text-sm text-[var(--sce-danger)]">{clubsError}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Schliessen
              </Button>
            </div>
          ) : visibleClubs.length === 0 ? (
            <div className="space-y-2 text-sm text-[var(--text-2)]" data-testid={`${testIdPrefix}-empty`}>
              {clubs.length === 0 ? (
                <p>Keine Vereine verfügbar.</p>
              ) : (
                <>
                  <p>{`Keine Vereine für «${search.trim()}» gefunden.`}</p>
                  <button
                    type="button"
                    className="text-[var(--sce-primary)] underline-offset-2 hover:underline"
                    onClick={() => setSearch("")}
                  >
                    Suche zurücksetzen
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <SceClubGrid clubs={visibleClubs} onSelectClub={handleClubPick} testId={`${testIdPrefix}-grid`} />
            </div>
          )}
        </div>
      );
    }

    if (phase === "teams" || phase === "manual-team") {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--sce-primary)]"
            onClick={() => {
              setPhase("clubs");
              setSelectedClub(null);
              setTeams([]);
              setSearch("");
            }}
            data-testid={`${testIdPrefix}-back-to-clubs`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Vereine
          </button>
          {selectedClub ? (
            <div className="flex flex-col items-center gap-2 border-b border-[var(--border)] pb-4">
              <ClubLogo logoUrl={selectedClub.logoUrl} name={selectedClub.name} size="xl" bare decorative />
              <p className="text-center text-lg font-semibold text-[var(--foreground)]">{selectedClub.name}</p>
            </div>
          ) : null}
          {phase === "manual-team" ? (
            <div className="space-y-3">
              <label className="block space-y-2" htmlFor={searchInputId}>
                <span className="fca-label">Anzeigename / Team (optional)</span>
                <input
                  id={searchInputId}
                  type="text"
                  value={manualTeamLabel}
                  onChange={(e) => setManualTeamLabel(e.target.value)}
                  className="fca-input w-full"
                  data-testid={`${testIdPrefix}-manual-team-input`}
                  placeholder="z. B. B1"
                />
              </label>
              <Button
                type="button"
                onClick={handleManualTeamConfirm}
                disabled={!manualTeamLabel.trim()}
                data-testid={`${testIdPrefix}-manual-team-confirm`}
              >
                Übernehmen
              </Button>
            </div>
          ) : (
            <>
              <SceClubTeamSearch
                value={search}
                onChange={setSearch}
                placeholder={searchPlaceholder}
                testId={`${testIdPrefix}-team-search`}
              />
              {teamsLoading ? (
                <p className="text-sm text-[var(--text-2)]">Teams werden geladen…</p>
              ) : teamsError ? (
                <p className="text-sm text-[var(--sce-danger)]">{teamsError}</p>
              ) : visibleExternalTeams.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-2)]">
                    {search.trim()
                      ? `Keine Teams für «${search.trim()}» gefunden.`
                      : "Kein strukturiertes Team im Verzeichnis — optionaler Anzeigename:"}
                  </p>
                  {!search.trim() ? (
                    <>
                      <input
                        type="text"
                        value={manualTeamLabel}
                        onChange={(e) => setManualTeamLabel(e.target.value)}
                        className="fca-input w-full"
                        data-testid={`${testIdPrefix}-manual-team-input`}
                        placeholder="z. B. B1"
                      />
                      <Button
                        type="button"
                        onClick={handleManualTeamConfirm}
                        disabled={!manualTeamLabel.trim()}
                        data-testid={`${testIdPrefix}-manual-team-confirm`}
                      >
                        Übernehmen
                      </Button>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <SceTeamList
                    teams={visibleExternalTeams}
                    onSelectTeam={handleTeamPick}
                    testId={`${testIdPrefix}-teams`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return null;
  })();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={resolvedTitle}
      size="xl"
      bodyLayout="flex"
      stackLayer="elevated"
      footer={
        <Button type="button" variant="secondary" onClick={handleClose} data-testid={`${testIdPrefix}-cancel`}>
          Abbrechen
        </Button>
      }
    >
      <div className="flex min-h-[min(70vh,640px)] flex-col" data-testid={testIdPrefix}>
        {body}
      </div>
    </Dialog>
  );
}
