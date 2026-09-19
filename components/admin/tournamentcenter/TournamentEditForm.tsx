"use client";

import TurniereTournamentRecordWorkspace, {
  type TurniereTournamentRecordWorkspaceProps,
} from "@/components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace";

export type TournamentEditFormProps = TurniereTournamentRecordWorkspaceProps;

export default function TournamentEditForm(props: TournamentEditFormProps) {
  return <TurniereTournamentRecordWorkspace {...props} />;
}
