"use client";

import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { Minus, Plus } from "lucide-react";
import MatchAvailabilityStatusBadge, {
  MatchAvailabilityConflictBadge,
} from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import MatchAvailabilityTrainerRecordMenu from "@/components/admin/matchcenter/MatchAvailabilityTrainerRecordMenu";
import {
  MATCH_SQUAD_PLAYER_ROW_ACTIONS_COLUMN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_GRID_CLASS,
  MATCH_SQUAD_PLAYER_ROW_LAYOUT,
  MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS,
} from "@/components/admin/matchcenter/match-squad-player-row-layout";
import { getMatchSquadRowProvenanceLabel } from "@/lib/match-squad/match-squad-provenance-presentation";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";

export type MatchSquadPlayerRowAction = "add" | "remove";

type Props = {
  player: MatchSquadPlayerPresentation;
  action: MatchSquadPlayerRowAction;
  onAction: () => void;
  disabled: boolean;
  matchId: string;
  canManageAvailability: boolean;
  onAvailabilityRecorded: () => void;
};

export default function MatchSquadPlayerRow({
  player,
  action,
  onAction,
  disabled,
  matchId,
  canManageAvailability,
  onAvailabilityRecorded,
}: Props) {
  const operationalProvenance = getMatchSquadRowProvenanceLabel(player.responseSource);
  const showPrimaryAction =
    action === "remove" || (action === "add" && player.canSelect);

  return (
    <li
      className={MATCH_SQUAD_PLAYER_ROW_GRID_CLASS}
      data-testid={`match-squad-player-${player.personId}`}
      data-layout={MATCH_SQUAD_PLAYER_ROW_LAYOUT}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 scale-[0.78] origin-left">
          <AdminAvatar name={player.displayName} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-medium leading-snug text-[var(--foreground)] sm:text-[15px]"
            title={player.displayName}
            data-testid={`match-squad-player-name-${player.personId}`}
          >
            {player.displayName}
          </p>
          {player.rosterIneligibleLabel ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{player.rosterIneligibleLabel}</p>
          ) : null}
        </div>
      </div>

      <div
        className={MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS}
        data-testid={`match-squad-availability-${player.personId}`}
        data-column="status"
      >
        <MatchAvailabilityStatusBadge
          label={player.availabilityLabel}
          tone={player.presentationTone}
          icon={player.presentationIcon}
          size="md"
          className="max-w-full justify-start"
        />
        {operationalProvenance ? (
          <span
            className="text-left text-xs text-[var(--muted)]"
            data-testid={`match-squad-provenance-${player.personId}`}
          >
            {operationalProvenance}
          </span>
        ) : null}
        {player.availabilityConflict ? (
          <MatchAvailabilityConflictBadge testId={`match-squad-conflict-${player.personId}`} />
        ) : null}
      </div>

      <div
        className={MATCH_SQUAD_PLAYER_ROW_ACTIONS_COLUMN_CLASS}
        data-column="actions"
      >
        {canManageAvailability ? (
          <MatchAvailabilityTrainerRecordMenu
            matchId={matchId}
            personId={player.personId}
            displayName={player.displayName}
            disabled={disabled}
            hasParticipationResponse={player.participationStatus !== null}
            onRecorded={onAvailabilityRecorded}
          />
        ) : null}
        {showPrimaryAction ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAction}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-4)] disabled:opacity-50"
            data-testid={
              action === "add"
                ? `match-squad-add-${player.personId}`
                : `match-squad-remove-${player.personId}`
            }
            aria-label={
              action === "remove"
                ? `${player.displayName} aus dem Aufgebot entfernen`
                : `${player.displayName} aufbieten`
            }
          >
            {action === "add" ? (
              <>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Aufbieten
              </>
            ) : (
              <>
                <span className="sr-only">Aufgeboten — </span>
                <Minus className="h-3.5 w-3.5" aria-hidden />
                Entfernen
              </>
            )}
          </button>
        ) : null}
      </div>
    </li>
  );
}
