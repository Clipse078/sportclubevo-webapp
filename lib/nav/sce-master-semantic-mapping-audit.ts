/**
 * SCE-ICONS-04 — semantic mapping audit for canonical navigation destinations.
 * Only HIGH-confidence rows may be adopted in {@link NAV_DESTINATION_SCE_ICON_BY_KEY}.
 */

export type SceSemanticMappingConfidence = "HIGH" | "MEDIUM" | "LOW";

export type SceSemanticMappingAuditRow = {
  destination: string;
  currentIcon: string;
  proposedSceMaster: string | null;
  confidence: SceSemanticMappingConfidence;
  adoptedNow: boolean;
};

/** Representative club-workspace destinations (subset of the 60 canonical nav model). */
export const SCE_MASTER_SEMANTIC_MAPPING_AUDIT: SceSemanticMappingAuditRow[] = [
  {
    destination: "dashboard",
    currentIcon: "SceIcon:dashboard",
    proposedSceMaster: "dashboard",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "wochenplanner",
    currentIcon: "SceIcon:week-planner",
    proposedSceMaster: "week-planner",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "trainingcenter",
    currentIcon: "SceIcon:training",
    proposedSceMaster: "training",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "matchcenter",
    currentIcon: "SceIcon:match",
    proposedSceMaster: "match",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "tournamentcenter",
    currentIcon: "SceIcon:tournament",
    proposedSceMaster: "tournament",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "teams",
    currentIcon: "Lucide:Users",
    proposedSceMaster: "team",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "org-units",
    currentIcon: "Lucide:Network",
    proposedSceMaster: "org-unit",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "personen",
    currentIcon: "Lucide:UserCircle",
    proposedSceMaster: "people",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "workspace",
    currentIcon: "Lucide:FolderOpen",
    proposedSceMaster: "documents",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "aufgaben",
    currentIcon: "Lucide:CheckSquare",
    proposedSceMaster: "tasks",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "communication",
    currentIcon: "Lucide:Mail",
    proposedSceMaster: "communication",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "admin-seasons",
    currentIcon: "Lucide:CalendarRange",
    proposedSceMaster: "season",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "admin-roles",
    currentIcon: "Lucide:Shield",
    proposedSceMaster: "roles-access",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "organisation",
    currentIcon: "Lucide:Building2",
    proposedSceMaster: "organisation",
    confidence: "MEDIUM",
    adoptedNow: false,
  },
  {
    destination: "veranstaltungen",
    currentIcon: "Lucide:PartyPopper",
    proposedSceMaster: "events",
    confidence: "MEDIUM",
    adoptedNow: false,
  },
  {
    destination: "competitions",
    currentIcon: "Lucide:Trophy",
    proposedSceMaster: "standings",
    confidence: "MEDIUM",
    adoptedNow: false,
  },
  {
    destination: "mitglieder",
    currentIcon: "Lucide:UsersRound",
    proposedSceMaster: "people",
    confidence: "MEDIUM",
    adoptedNow: false,
  },
  {
    destination: "admin-facilities",
    currentIcon: "Lucide:MapPin",
    proposedSceMaster: "pitch",
    confidence: "LOW",
    adoptedNow: false,
  },
  {
    destination: "vereine",
    currentIcon: "Lucide:Landmark",
    proposedSceMaster: "club",
    confidence: "LOW",
    adoptedNow: false,
  },
];

export function summarizeSceSemanticMappingAudit(rows = SCE_MASTER_SEMANTIC_MAPPING_AUDIT) {
  return {
    highConfidence: rows.filter((r) => r.confidence === "HIGH").length,
    mediumConfidence: rows.filter((r) => r.confidence === "MEDIUM").length,
    lowConfidence: rows.filter((r) => r.confidence === "LOW").length,
    adoptedNow: rows.filter((r) => r.adoptedNow).length,
    deferred: rows.filter((r) => !r.adoptedNow).length,
  };
}
