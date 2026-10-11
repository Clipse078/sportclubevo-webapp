"use client";

import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import { Minus, Plus } from "lucide-react";
import MatchAvailabilityStatusBadge, {
  MatchAvailabilityConflictBadge,
} from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import {
  MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_AUFBIETEN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_ENTFERNEN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_GRID_CLASS,
  MATCH_SQUAD_PLAYER_ROW_LAYOUT,
  MATCH_SQUAD_PLAYER_ROW_PLAYER_COLUMN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS,
} from "@/components/admin/matchcenter/match-squad-player-row-layout";
import ActivityPlayerReleaseButton from "@/components/admin/teams/ActivityPlayerReleaseButton";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";

export type MatchSquadPlayerRowAction = "add" | "remove";

type Props = {
  player: MatchSquadPlayerPresentation;
  action: MatchSquadPlayerRowAction;
  onAction: () => void;
  disabled: boolean;
  releaseContext?: {
    teamId: string;
    teamSeasonId: string;
    matchId: string;
    matchLabel: string;
    canManageRelease: boolean;
    releaseReadOnly?: boolean;
  };
};

export default function MatchSquadPlayerRow({
  player,
  action,
  onAction,
  disabled,
  releaseContext,
}: Props) {
  const showPrimaryAction =
    action === "remove" || (action === "add" && player.canSelect);

  return (
    <li
      className={MATCH_SQUAD_PLAYER_ROW_GRID_CLASS}
      data-testid={`match-squad-player-${player.personId}`}
      data-layout={MATCH_SQUAD_PLAYER_ROW_LAYOUT}
    >
      <div className={MATCH_SQUAD_PLAYER_ROW_PLAYER_COLUMN_CLASS} data-column="player">
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
          className="w-fit max-w-full justify-start"
        />
        {player.availabilityConflict ? (
          <MatchAvailabilityConflictBadge testId={`match-squad-conflict-${player.personId}`} />
        ) : null}
      </div>

      <div className={MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS} data-column="action">
        {showPrimaryAction ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAction}
            className={
              action === "add"
                ? MATCH_SQUAD_PLAYER_ROW_AUFBIETEN_CLASS
                : MATCH_SQUAD_PLAYER_ROW_ENTFERNEN_CLASS
            }
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

      <div className={MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS} data-column="release">
        {releaseContext ? (
          <ActivityPlayerReleaseButton
            teamId={releaseContext.teamId}
            teamSeasonId={releaseContext.teamSeasonId}
            personId={player.personId}
            personDisplayName={player.displayName}
            canManage={releaseContext.canManageRelease}
            disabled={releaseContext.releaseReadOnly}
            activityContext={{
              mode: "ACTIVITY",
              eventId: releaseContext.matchId,
              scopeLabel: releaseContext.matchLabel,
            }}
            testId={`match-squad-release-${player.personId}`}
          />
        ) : null}
      </div>
    </li>
  );
}
