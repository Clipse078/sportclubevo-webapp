import Link from "next/link";
import { EmptyState } from "@/components/ui/page/EmptyState";
import type {
  ClubEventFreigabenUnauthorizedDisplay,
  ClubEventFreigabenUnauthorizedReason,
} from "@/lib/club-events/governance/resolve-club-event-freigaben-access";

type Props = {
  reason: ClubEventFreigabenUnauthorizedReason;
  display: ClubEventFreigabenUnauthorizedDisplay;
};

function resolveCopy(
  reason: ClubEventFreigabenUnauthorizedReason,
  display: ClubEventFreigabenUnauthorizedDisplay,
): {
  heading: string;
  description: string;
  adminActionHref: string | null;
  adminActionLabel: string | null;
} {
  if (display === "GOVERNANCE_ADMIN_NON_VALIDATOR") {
    return {
      heading: "Keine Freigabeberechtigung",
      description:
        "Du bist aktuell nicht als freigabeberechtigte Person für Veranstaltungen hinterlegt. Die Freigabeberechtigungen können unter Admin → Personen & Zugänge verwaltet werden.",
      adminActionHref: "/dashboard/admin/people-access",
      adminActionLabel: "Freigaben verwalten",
    };
  }

  switch (reason) {
    case "MISSING_APPROVE_PERMISSION":
      return {
        heading: "Kein Zugriff auf Veranstaltungs-Freigaben",
        description:
          "Für diesen Bereich ist die Freigabeberechtigung für Vereinsanlässe erforderlich. Bitte wenden Sie sich an eine Club-Administration, um die Berechtigung zuzuweisen.",
        adminActionHref: null,
        adminActionLabel: null,
      };
    case "NOT_IN_VALIDATOR_POOL":
      return {
        heading: "Kein Zugriff auf Veranstaltungs-Freigaben",
        description:
          "Freigabeentscheidungen sind nur für konfigurierte Freigabeberechtigte Personen verfügbar. Die Club-Administration kann Freigabeberechtigte unter Personen & Zugänge pflegen; Verwaltung der Erstellerregeln bleibt davon getrennt.",
        adminActionHref: null,
        adminActionLabel: null,
      };
    case "NO_PERSON_LINK":
      return {
        heading: "Kein Zugriff auf Veranstaltungs-Freigaben",
        description:
          "Ihr Benutzerkonto ist keiner Person im Verein zugeordnet. Ohne Personenzuordnung können Freigaben nicht geprüft werden.",
        adminActionHref: null,
        adminActionLabel: null,
      };
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export default function ClubEventFreigabenUnauthorizedState({ reason, display }: Props) {
  const copy = resolveCopy(reason, display);

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid="club-event-freigaben-unauthorized"
      data-reason={reason}
      data-display={display}
    >
      <EmptyState
        heading={copy.heading}
        description={copy.description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {copy.adminActionHref && copy.adminActionLabel ? (
              <Link href={copy.adminActionHref} className="fca-button-primary text-sm">
                {copy.adminActionLabel}
              </Link>
            ) : null}
            <Link href="/dashboard/veranstaltungen" className="fca-button-secondary text-sm">
              Zurück zu Veranstaltungen
            </Link>
          </div>
        }
      />
    </div>
  );
}
