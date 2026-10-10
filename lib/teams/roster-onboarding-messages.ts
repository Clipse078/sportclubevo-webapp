/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B — human-readable roster onboarding copy.
 */

export function squadMembershipStatusHint(status: string): string | null {
  switch (status) {
    case "ACTIVE":
      return "Diese Person ist bereits im Kader dieser Saison.";
    case "INACTIVE":
    case "ARCHIVED":
      return "Frühere Kaderzuordnung vorhanden — kann wieder aktiviert werden.";
    case "INJURED":
    case "ABSENT":
      return "Bestehende Kaderzuordnung mit Status «" + status + "».";
    default:
      return null;
  }
}

export function trainerMembershipStatusHint(status: string): string | null {
  switch (status) {
    case "ACTIVE":
      return "Diese Person ist bereits im Trainerteam dieser Saison.";
    case "INACTIVE":
    case "ARCHIVED":
      return "Frühere Trainerteam-Zuordnung vorhanden — kann wieder aktiviert werden.";
    default:
      return null;
  }
}

export function mapRosterFetchErrorMessage(raw: string | undefined, fallback: string): string {
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim();
  if (
    normalized.includes("bereits zugewiesen") ||
    normalized.includes("bereits im Kader") ||
    normalized.includes("ALREADY_ACTIVE")
  ) {
    return "Diese Person ist bereits im Kader dieser Saison.";
  }
  if (normalized.includes("kein aktiver Spieler") || normalized.includes("PERSON_NOT_ELIGIBLE")) {
    return "Diese Person ist nicht als Spieler/in markiert. Aktivieren Sie die Spieler-Kapazität unter People & Access oder nutzen Sie «Als Spieler aktivieren», sofern Sie berechtigt sind.";
  }
  if (normalized.includes("kein aktiver Trainer") || normalized.includes("Trainer-Kapazität")) {
    return "Diese Person ist nicht als Trainer/in markiert. Aktivieren Sie die Trainer-Kapazität unter People & Access oder nutzen Sie «Als Trainer aktivieren», sofern Sie berechtigt sind.";
  }
  if (normalized.includes("Jahrgang") || normalized.includes("JAHRGANG")) {
    return normalized;
  }
  if (normalized.includes("Team-Saison nicht gefunden")) {
    return "Die Team-Saison wurde nicht gefunden. Bitte Seite aktualisieren oder eine aktive Saison anlegen.";
  }
  if (normalized.includes("Status nicht aktiv")) {
    return "Kaderänderungen sind für diese Team-Saison derzeit nicht möglich (Saison nicht aktiv).";
  }
  if (normalized.includes("nicht gefunden")) {
    return normalized;
  }
  if (normalized.includes("Keine Berechtigung") || normalized.includes("403")) {
    return "Keine Berechtigung für diese Aktion (teams.manage erforderlich).";
  }

  return normalized;
}
