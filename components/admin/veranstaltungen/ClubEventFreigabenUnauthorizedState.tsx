import Link from "next/link";
import { EmptyState } from "@/components/ui/page/EmptyState";
import type { ClubEventFreigabenUnauthorizedReason } from "@/lib/club-events/governance/resolve-club-event-freigaben-access";

type Props = {
  reason: ClubEventFreigabenUnauthorizedReason;
};

function resolveCopy(reason: ClubEventFreigabenUnauthorizedReason): {
  heading: string;
  description: string;
} {
  switch (reason) {
    case "MISSING_APPROVE_PERMISSION":
      return {
        heading: "Kein Zugriff auf Veranstaltungs-Freigaben",
        description:
          "Für diesen Bereich ist die Freigabeberechtigung für Vereinsanlässe erforderlich (activities.club_event.approve). Bitte wenden Sie sich an eine Club-Administration, um die Berechtigung zuzuweisen.",
      };
    case "NOT_IN_VALIDATOR_POOL":
      return {
        heading: "Kein Zugriff auf Veranstaltungs-Freigaben",
        description:
          "Freigabeentscheidungen sind nur für konfigurierte Freigabeberechtigte Personen verfügbar. Die Club-Administration kann Freigabeberechtigte unter Personen & Zugänge pflegen; Verwaltung der Erstellerregeln bleibt davon getrennt.",
      };
    case "NO_PERSON_LINK":
      return {
        heading: "Kein Zugriff auf Veranstaltungs-Freigaben",
        description:
          "Ihr Benutzerkonto ist keiner Person im Verein zugeordnet. Ohne Personenzuordnung können Freigaben nicht geprüft werden.",
      };
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export default function ClubEventFreigabenUnauthorizedState({ reason }: Props) {
  const copy = resolveCopy(reason);

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid="club-event-freigaben-unauthorized"
      data-reason={reason}
    >
      <EmptyState
        heading={copy.heading}
        description={copy.description}
        action={
          <Link href="/dashboard/veranstaltungen" className="fca-button-secondary text-sm">
            Zurück zu Veranstaltungen
          </Link>
        }
      />
    </div>
  );
}
