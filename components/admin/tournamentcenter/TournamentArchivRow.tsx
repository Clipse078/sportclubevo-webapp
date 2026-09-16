import type { TournamentDto } from "@/lib/tournaments/types";
import { assessTournamentOperationalState } from "@/lib/tournaments/operational-state";
import TournamentOperationalRow from "./TournamentOperationalRow";

type TournamentArchivRowProps = {
  tournament: TournamentDto;
  locale: string;
  timezone: string;
  compactDate?: boolean;
};

export default function TournamentArchivRow({ tournament, locale, timezone, compactDate }: TournamentArchivRowProps) {
  return (
    <TournamentOperationalRow
      tournament={tournament}
      assessment={assessTournamentOperationalState(tournament)}
      locale={locale}
      timezone={timezone}
      compactDate={compactDate}
      variant="past"
    />
  );
}
