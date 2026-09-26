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
    destination: "planung",
    currentIcon: "Lucide:CalendarDays",
    proposedSceMaster: "planning",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "website",
    currentIcon: "Lucide:Globe",
    proposedSceMaster: "website",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "website-news",
    currentIcon: "Lucide:Newspaper",
    proposedSceMaster: "news",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "infoboard",
    currentIcon: "Lucide:Monitor",
    proposedSceMaster: "infoboard",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "website-publishing",
    currentIcon: "Lucide:Upload",
    proposedSceMaster: "publish",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "website-settings",
    currentIcon: "Lucide:Settings",
    proposedSceMaster: "settings",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "platform-commercial-billing-invoices",
    currentIcon: "Lucide:Receipt",
    proposedSceMaster: "billing-invoice",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "finanzen",
    currentIcon: "Lucide:Wallet",
    proposedSceMaster: "finance",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "platform-commercial-billing-overview",
    currentIcon: "Lucide:LayoutDashboard",
    proposedSceMaster: "finance",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "platform-commercial-billing-customers",
    currentIcon: "Lucide:Users",
    proposedSceMaster: "commercial-account",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "platform-commercial-billing-contracts",
    currentIcon: "Lucide:FileSignature",
    proposedSceMaster: "contract",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "platform-commercial-billing-reconciliation",
    currentIcon: "Lucide:ArrowLeftRight",
    proposedSceMaster: "transaction",
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
    proposedSceMaster: "member",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "anmeldungen",
    currentIcon: "Lucide:ClipboardList",
    proposedSceMaster: "invitation",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "trainer-staff",
    currentIcon: "Lucide:Whistle",
    proposedSceMaster: "coach",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "helfereinsaetze",
    currentIcon: "Lucide:HandHelping",
    proposedSceMaster: "volunteer",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "sponsoring",
    currentIcon: "Lucide:BadgeDollarSign",
    proposedSceMaster: "sponsor",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "admin-facilities",
    currentIcon: "Lucide:MapPin",
    proposedSceMaster: "facility",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "admin-people-access",
    currentIcon: "Lucide:UserCog",
    proposedSceMaster: "invitation",
    confidence: "HIGH",
    adoptedNow: true,
  },
  {
    destination: "meetings",
    currentIcon: "Lucide:Users",
    proposedSceMaster: "committee-board",
    confidence: "MEDIUM",
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
