import type { PlayerBirthYearEligibilityKind } from "@/lib/teams/player-birth-year-eligibility";

export type RosterEligibilityPresentation = {
  title: string;
  body: string;
  allowedBirthYearsLabel: string | null;
  showPersonBirthDateCta: boolean;
  personEditHref: string | null;
  tone: "warning" | "danger";
};

export function formatAllowedBirthYearsLabel(years: number[]): string | null {
  if (!years.length) {
    return null;
  }

  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return String(sorted[0]);
  }

  return `${sorted[0]}–${sorted[sorted.length - 1]}`;
}

export function buildPersonBirthDateEditHref(args: {
  personId: string;
  returnTo?: string | null;
}): string {
  const base = `/dashboard/persons/${args.personId}/edit`;
  if (!args.returnTo) {
    return base;
  }

  return `${base}?returnTo=${encodeURIComponent(args.returnTo)}`;
}

export function presentRosterBirthYearEligibility(args: {
  kind: PlayerBirthYearEligibilityKind;
  allowedBirthYears: number[];
  birthYear: number | null;
  personId: string;
  canEditPerson: boolean;
  returnTo?: string | null;
}): RosterEligibilityPresentation | null {
  const allowedBirthYearsLabel = formatAllowedBirthYearsLabel(args.allowedBirthYears);
  const personEditHref = args.canEditPerson
    ? buildPersonBirthDateEditHref({
        personId: args.personId,
        returnTo: args.returnTo ?? null,
      })
    : null;

  switch (args.kind) {
    case "ELIGIBLE":
    case "UNRESTRICTED":
      return null;
    case "MISSING_PERSON_DOB":
      return {
        title: "Zuordnung noch nicht möglich",
        body: "Für die Prüfung der Spielberechtigung fehlt das Geburtsdatum.",
        allowedBirthYearsLabel,
        showPersonBirthDateCta: args.canEditPerson,
        personEditHref,
        tone: "warning",
      };
    case "INVALID_PERSON_DOB":
      return {
        title: "Zuordnung nicht möglich",
        body: "Das Geburtsdatum dieser Person ist ungültig. Bitte Stammdaten prüfen.",
        allowedBirthYearsLabel: null,
        showPersonBirthDateCta: args.canEditPerson,
        personEditHref,
        tone: "danger",
      };
    case "BIRTH_YEAR_OUTSIDE_RANGE":
      return {
        title: "Zuordnung nicht möglich",
        body:
          args.birthYear != null && allowedBirthYearsLabel
            ? `Geburtsjahr ${args.birthYear} passt nicht zur Altersregel dieses Teams.`
            : "Das Geburtsjahr passt nicht zur Altersregel dieses Teams.",
        allowedBirthYearsLabel,
        showPersonBirthDateCta: false,
        personEditHref: null,
        tone: "danger",
      };
    case "TEAM_CONFIG_INCOMPLETE":
      return {
        title: "Teamkonfiguration unvollständig",
        body: "Die Jahrgangs- bzw. Altersregel für dieses Team kann derzeit nicht geprüft werden. Bitte Team-Stammdaten (Altersgruppe) und Saison prüfen.",
        allowedBirthYearsLabel: null,
        showPersonBirthDateCta: false,
        personEditHref: null,
        tone: "warning",
      };
    default:
      return null;
  }
}

export function rosterEligibilityErrorMessage(args: {
  kind: PlayerBirthYearEligibilityKind;
  allowedBirthYears: number[];
  birthYear: number | null;
}): string {
  const presentation = presentRosterBirthYearEligibility({
    kind: args.kind,
    allowedBirthYears: args.allowedBirthYears,
    birthYear: args.birthYear,
    personId: "placeholder",
    canEditPerson: false,
  });

  if (!presentation) {
    return "Spieler kann diesem Team nicht zugewiesen werden.";
  }

  const parts = [presentation.title, presentation.body];
  if (presentation.allowedBirthYearsLabel) {
    parts.push(`Erlaubte Jahrgänge: ${presentation.allowedBirthYearsLabel}`);
  }

  return parts.join(" ");
}
