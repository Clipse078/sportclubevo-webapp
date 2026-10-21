/**
 * SCE Design System v1.0 — typed governance exceptions (DS-11).
 * Meaningful deviations only — not a legacy violation snapshot.
 */

export type SceDesignSystemExceptionCategory =
  | "SEMANTIC_CONTENT_EXCEPTION"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "EXPLICIT_ARCHITECTURE_EXCEPTION"
  | "MIGRATION_DEBT";

export type SceDesignSystemGovernanceException = {
  id: string;
  category: SceDesignSystemExceptionCategory;
  /** Repo-relative path, glob prefix, or component id */
  scope: string;
  reason: string;
  owner?: string;
  reviewNote?: string;
};

function requireReason(reason: string): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error("SCE governance exception requires a non-empty reason");
  }
  return trimmed;
}

/** Authoritative exception registry — UNCLASSIFIED drift must not bypass via silence. */
export const SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY: SceDesignSystemGovernanceException[] = [
  {
    id: "SCE-DS-EX-SEM-001",
    category: "SEMANTIC_CONTENT_EXCEPTION",
    scope: "components/sce/tournament/SceTournamentSpielplanDocument.tsx",
    reason:
      "Print/PDF tournament spielplan document — semantic paper-white preview surface, not admin functional chrome.",
    reviewNote: "DS-11 surface governance scoped to workspace functional hierarchy.",
  },
  {
    id: "SCE-DS-EX-SEM-002",
    category: "SEMANTIC_CONTENT_EXCEPTION",
    scope: "components/sce/tournament/SceTournamentTeamSpielplanDocument.tsx",
    reason:
      "Print/PDF team spielplan document — semantic paper-white preview surface, not admin functional chrome.",
  },
  {
    id: "SCE-DS-EX-DOM-001",
    category: "DOMAIN_SPECIFIC_CANONICAL",
    scope: "app/(admin)/dashboard/training/new/",
    reason:
      "Activity composer primary entry — full-page /new is the canonical SCE Activity Composer workspace, not admin modal-first entity create.",
  },
  {
    id: "SCE-DS-EX-DOM-002",
    category: "DOMAIN_SPECIFIC_CANONICAL",
    scope: "app/(admin)/dashboard/matchcenter/new/",
    reason: "Match Activity Composer — canonical /new composer entry with draft deep links.",
  },
  {
    id: "SCE-DS-EX-DOM-003",
    category: "DOMAIN_SPECIFIC_CANONICAL",
    scope: "app/(admin)/dashboard/veranstaltungen/new/",
    reason: "Club event Activity Composer — canonical /new composer entry.",
  },
  {
    id: "SCE-DS-EX-DOM-004",
    category: "DOMAIN_SPECIFIC_CANONICAL",
    scope: "app/(admin)/dashboard/tournamentcenter/new/",
    reason: "Tournament Activity Composer — canonical /new composer entry.",
  },
  {
    id: "SCE-DS-EX-DOM-005",
    category: "DOMAIN_SPECIFIC_CANONICAL",
    scope: "app/(admin)/dashboard/planner/new/",
    reason: "Wochenplaner planner entry — operational planning surface, not generic modal-first CRUD.",
  },
  {
    id: "SCE-DS-EX-ARCH-001",
    category: "EXPLICIT_ARCHITECTURE_EXCEPTION",
    scope: "components/admin/teams/TeamCockpitNav.tsx",
    reason:
      "Route-segment team cockpit IA — mode switcher, not product-wide SceContextTabs duplication.",
  },
  {
    id: "SCE-DS-EX-ARCH-002",
    category: "EXPLICIT_ARCHITECTURE_EXCEPTION",
    scope: "components/admin/layout/GlobalNavDrawer.tsx",
    reason:
      "Global navigation drawer overlay — portalled shell chrome; z-index tracked separately from SCE contextual preview token.",
    reviewNote: "MIGRATION_DEBT for z-[80] overlay — not canonical SCE component family.",
  },
  {
    id: "SCE-DS-EX-MIG-001",
    category: "MIGRATION_DEBT",
    scope: "components/admin/planning-hub/PlanningHubActivityDetailSurface.tsx",
    reason: "Legacy z-[80] popover — outside DS-11 canonical SCE component closure scope.",
  },
];

/** Validates registry invariants at module load (fail fast in tests/CI). */
export function assertSceDesignSystemExceptionRegistryValid(
  registry: SceDesignSystemGovernanceException[] = SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY,
): void {
  const ids = new Set<string>();
  for (const entry of registry) {
    if (!entry.id.trim()) {
      throw new Error("SCE governance exception missing id");
    }
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate SCE governance exception id: ${entry.id}`);
    }
    ids.add(entry.id);
    requireReason(entry.reason);
    if (!entry.scope.trim()) {
      throw new Error(`SCE governance exception ${entry.id} missing scope`);
    }
  }
}

assertSceDesignSystemExceptionRegistryValid();

export function findSceDesignSystemExceptionsByCategory(
  category: SceDesignSystemExceptionCategory,
): SceDesignSystemGovernanceException[] {
  return SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY.filter((e) => e.category === category);
}

/** True when `filePath` is covered by a registry scope prefix or exact path. */
export function isPathCoveredBySceDesignSystemException(
  filePath: string,
  categories?: SceDesignSystemExceptionCategory[],
): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY.some((entry) => {
    if (categories && !categories.includes(entry.category)) return false;
    const scope = entry.scope.replace(/\\/g, "/");
    return normalized === scope || normalized.startsWith(scope);
  });
}
