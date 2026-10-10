"use client";

import MatchSquadPlayerRow, {
  type MatchSquadPlayerRowAction,
} from "@/components/admin/matchcenter/MatchSquadPlayerRow";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";

type Props = {
  players: MatchSquadPlayerPresentation[];
  action: MatchSquadPlayerRowAction;
  onToggle: (personId: string, select: boolean) => void;
  canMutate: boolean;
  listTestId?: string;
};

export default function MatchSquadPlayerList({
  players,
  action,
  onToggle,
  canMutate,
  listTestId,
}: Props) {
  return (
    <ul
      className="divide-y divide-[var(--border)]/60"
      data-testid={listTestId}
      data-layout="single-column-rows"
    >
      {players.map((player) => (
        <MatchSquadPlayerRow
          key={player.personId}
          player={player}
          action={action}
          disabled={
            !canMutate || (action === "add" ? !player.canSelect : !player.canRemove)
          }
          onAction={() =>
            onToggle(player.personId, action === "add")
          }
        />
      ))}
    </ul>
  );
}
