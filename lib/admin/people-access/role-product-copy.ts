/**
 * Product-facing role descriptions for Club Admin UX.
 * Falls back to DB description, then key-based defaults for known system roles.
 */

const KEY_DESCRIPTIONS: Record<string, string> = {
  club_admin: "Vereinsweite Administration und Zugriffsverwaltung.",
  trainer: "Team organisieren, planen und kommunizieren.",
  co_trainer: "Trainings und Team unterstützen.",
  team_manager: "Team organisieren und kommunizieren.",
  vorstand: "Vereinsleitung und strategische Steuerung.",
  publish: "Inhalte veröffentlichen und kommunizieren.",
  communication: "Vereinskommunikation verwalten.",
};

function normalizeRoleKey(key: string): string {
  const base = key.split("__")[0] ?? key;
  return base.replace(/-/g, "_").toLowerCase();
}

export function getRoleProductDescription(params: {
  key: string;
  description: string | null;
}): string {
  if (params.description?.trim()) return params.description.trim();
  const normalized = normalizeRoleKey(params.key);
  for (const [prefix, text] of Object.entries(KEY_DESCRIPTIONS)) {
    if (normalized === prefix || normalized.startsWith(`${prefix}_`)) return text;
  }
  return "Funktion im Verein mit definierten Zugriffsrechten.";
}

export function isClubAdminRoleKey(roleKey: string, clubAdminRoleKey: string): boolean {
  const k = roleKey.toLowerCase();
  const admin = clubAdminRoleKey.toLowerCase();
  return k === admin || k === "club_admin" || k.startsWith("club_admin");
}
