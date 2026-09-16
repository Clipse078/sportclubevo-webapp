import type { TournamentDto } from "@/lib/tournaments/types";
import type { TournamentOperationalAssessment } from "@/lib/tournaments/operational-state";
import TournamentOperationalRow from "./TournamentOperationalRow";

type TournamentListRowProps = {
  tournament: TournamentDto;
  assessment: TournamentOperationalAssessment;
  locale: string;
  timezone: string;
  compactDate?: boolean;
};

export default function TournamentListRow(props: TournamentListRowProps) {
  return <TournamentOperationalRow {...props} variant="upcoming" />;
}
