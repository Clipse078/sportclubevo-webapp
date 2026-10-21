/**
 * SCE Design System v1.0 — static governance scanner (DS-11).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SCE_DESIGN_SYSTEM_GOVERNANCE_RULES,
  SCE_GOVERNANCE_ACTIVITY_COMPOSER_ROUTE_PREFIXES,
  SCE_GOVERNANCE_DEEP_LINK_CREATE_ROUTES,
  SCE_GOVERNANCE_CANONICAL_ACTIVITY_CARD_PATHS,
  SCE_GOVERNANCE_CHECKBOX_BASELINE_PATHS,
} from "@/lib/design-system/sce-design-system-governance";
import {
  isPathCoveredBySceDesignSystemException,
  SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY,
} from "@/lib/design-system/sce-design-system-exception-registry";
import {
  SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS,
  SCE_Z_INDEX_CONTEXTUAL_PREVIEW,
} from "@/lib/ui/sce-overlay-layering";

export type SceGovernanceViolation = {
  ruleId: keyof typeof SCE_DESIGN_SYSTEM_GOVERNANCE_RULES;
  file: string;
  reason: string;
  suggestion: string;
};

export type SceDesignSystemGovernanceRunResult = {
  pass: boolean;
  violations: SceGovernanceViolation[];
  filesScanned: number;
  ruleCount: number;
  durationMs: number;
  metrics: {
    checkboxBaselinePaths: number;
    exceptionRegistryEntries: number;
  };
};

const ROOT = process.cwd();

const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "baseline-backups",
  "__tests__",
  "dist",
  "coverage",
]);

function walkRepoFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIR_NAMES.has(entry.name) || entry.name === "__governance-fixtures__") continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRepoFiles(abs, out);
      continue;
    }
    if (!SCAN_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) continue;
    if (entry.name.includes(".test.")) continue;
    out.push(abs);
  }
  return out;
}

function rel(absPath: string): string {
  return relative(ROOT, absPath).replace(/\\/g, "/");
}

function readRel(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function pushViolation(
  violations: SceGovernanceViolation[],
  ruleId: keyof typeof SCE_DESIGN_SYSTEM_GOVERNANCE_RULES,
  file: string,
  reason: string,
): void {
  const rule = SCE_DESIGN_SYSTEM_GOVERNANCE_RULES[ruleId];
  violations.push({
    ruleId,
    file,
    reason,
    suggestion: rule.suggestion,
  });
}

function scanCheckboxBaseline(violations: SceGovernanceViolation[], file: string, src: string): void {
  if (!src.includes('type="checkbox"') && !src.includes("type='checkbox'")) return;

  const normalized = file.replace(/\\/g, "/");
  if (normalized.startsWith("lib/design-system/")) return;

  if (SCE_GOVERNANCE_CHECKBOX_BASELINE_PATHS.includes(normalized as (typeof SCE_GOVERNANCE_CHECKBOX_BASELINE_PATHS)[number])) {
    if (
      /data-sce-binary-setting-row/.test(src) &&
      /type=(["'])checkbox\1/.test(src) &&
      !/SwitchThumb|SwitchToggle/.test(src)
    ) {
      pushViolation(
        violations,
        "SCE-DS-GOV-CONTROL-002",
        file,
        "Checkbox appears alongside binary-setting row marker — binary settings must use SwitchToggle.",
      );
    }
    return;
  }

  if (normalized.endsWith("components/sce/forms/SceCheckbox.tsx")) return;

  pushViolation(
    violations,
    "SCE-DS-GOV-CONTROL-001",
    file,
    "New raw checkbox usage outside DS-10 baseline allowlist.",
  );
}

function scanCreateTriggers(violations: SceGovernanceViolation[], file: string, src: string): void {
  if (!file.includes("CreateTrigger") && !file.includes("CreateComposerDialog")) return;
  if (!file.includes("components/admin/")) return;
  if (file.includes("ComposerCreateTrigger") || src.includes("SceActivityCreateMenu")) return;
  if (file.includes("ContextualTaskCreateTrigger")) return;
  if (!src.includes("fca-button") && !src.includes("button")) return;
  if (src.includes('data-sce-create-flow="modal"')) return;
  if (src.includes("data-sce-create-flow='modal'")) return;
  pushViolation(
    violations,
    "SCE-DS-GOV-CREATE-001",
    file,
    "Primary admin create trigger missing data-sce-create-flow=\"modal\".",
  );
}

function scanPrimaryFullPageCreatePages(
  violations: SceGovernanceViolation[],
  file: string,
  src: string,
): void {
  if (!file.includes("app/(admin)/dashboard/") || !file.endsWith("/new/page.tsx")) return;
  const normalized = file.replace(/\\/g, "/");
  if (
    SCE_GOVERNANCE_ACTIVITY_COMPOSER_ROUTE_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix),
    )
  ) {
    return;
  }
  if (isPathCoveredBySceDesignSystemException(normalized)) return;
  if (
    SCE_GOVERNANCE_DEEP_LINK_CREATE_ROUTES.includes(
      normalized as (typeof SCE_GOVERNANCE_DEEP_LINK_CREATE_ROUTES)[number],
    )
  ) {
    return;
  }
  if (src.includes('data-sce-create-flow="deep-link-fallback"')) return;
  if (src.includes("layout=composer")) return;
  if (src.includes("ComposerDialog") || src.includes("ComposerShell")) return;

  const hasModalFirstSibling =
    src.includes("redirect(") ||
    src.includes("notFound(") ||
    src.includes("CreateTenantRoleForm") ||
    src.includes("bootstrapMitteilungComposer") ||
    src.includes("bootstrapKampagneComposer");

  if (hasModalFirstSibling) return;

  pushViolation(
    violations,
    "SCE-DS-GOV-CREATE-001",
    file,
    "Full-page /new route without documented composer/deep-link exception — verify modal-first primary entry still exists.",
  );
}

const SURFACE_SCAN_PREFIXES = [
  "components/sce/workspace/",
  "components/admin/org/OrgUnitBuilderWorkspace.tsx",
  "components/admin/org/OrgUnitContextualPreviewLayer.tsx",
];

function scanFunctionalSurfaces(violations: SceGovernanceViolation[], file: string, src: string): void {
  const normalized = file.replace(/\\/g, "/");
  if (!SURFACE_SCAN_PREFIXES.some((p) => normalized === p || normalized.startsWith(p))) return;
  if (isPathCoveredBySceDesignSystemException(normalized, ["SEMANTIC_CONTENT_EXCEPTION"])) return;

  for (const token of ["bg-white", "bg-gray-50", "bg-slate-50", "bg-neutral-50"]) {
    if (src.includes(token)) {
      pushViolation(
        violations,
        "SCE-DS-GOV-SURFACE-001",
        file,
        `Unclassified light functional surface token \`${token}\` in canonical SCE workspace surface.`,
      );
      break;
    }
  }
}

function scanWorkspaceAntiPatterns(
  violations: SceGovernanceViolation[],
  file: string,
  src: string,
): void {
  if (file.startsWith("lib/design-system/")) return;
  if (src.includes("@/components/admin/shared/AdminShell") && !src.includes("must not reappear")) {
    pushViolation(
      violations,
      "SCE-DS-GOV-WORKSPACE-001",
      file,
      "Removed parallel AdminShell must not reappear — use SceWorkspaceChrome.",
    );
  }
}

function scanActivityParallelCards(
  violations: SceGovernanceViolation[],
  file: string,
  src: string,
): void {
  const normalized = file.replace(/\\/g, "/");
  if (!normalized.includes("components/")) return;
  if (normalized.includes("components/sporting-activity/")) return;
  if (src.includes("@/components/admin/matchcenter/MatchCard")) {
    pushViolation(
      violations,
      "SCE-DS-GOV-ACTIVITY-001",
      file,
      "Deprecated parallel MatchCard import — use SceMatchCard family.",
    );
  }
}

const LAYER_CANONICAL_PREFIXES = [
  "components/sce/",
  "components/admin/org/OrgUnitContextualPreviewLayer.tsx",
];

function scanMagicZIndex(violations: SceGovernanceViolation[], file: string, src: string): void {
  const normalized = file.replace(/\\/g, "/");
  if (!LAYER_CANONICAL_PREFIXES.some((p) => normalized.startsWith(p) || normalized === p)) return;
  if (isPathCoveredBySceDesignSystemException(normalized, ["MIGRATION_DEBT", "EXPLICIT_ARCHITECTURE_EXCEPTION"])) {
    return;
  }

  const magic = src.match(/z-\[(\d+)\]/g);
  if (!magic) return;

  const allowed = new Set([
    `z-[${SCE_Z_INDEX_CONTEXTUAL_PREVIEW}]`,
    "z-[1]",
    "z-[2]",
  ]);

  for (const token of magic) {
    if (allowed.has(token)) continue;
    if (normalized.includes("OrgUnitContextualPreviewLayer") && token === `z-[${SCE_Z_INDEX_CONTEXTUAL_PREVIEW}]`) {
      continue;
    }
    pushViolation(
      violations,
      "SCE-DS-GOV-LAYER-001",
      file,
      `Unexplained arbitrary Tailwind z-index \`${token}\` in canonical SCE UI.`,
    );
  }

  if (
    normalized.includes("OrgUnitContextualPreviewLayer.tsx") &&
    src.includes(`z-[${SCE_Z_INDEX_CONTEXTUAL_PREVIEW}]`) &&
    !src.includes(SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS)
  ) {
    pushViolation(
      violations,
      "SCE-DS-GOV-LAYER-001",
      file,
      "Organisation Builder preview must use canonical contextual preview layer class/token.",
    );
  }
}

function scanOrgPreviewA11y(violations: SceGovernanceViolation[]): void {
  const file = "components/admin/org/OrgUnitContextualPreviewLayer.tsx";
  const src = readRel(file);
  for (const marker of [
    "data-org-contextual-preview",
    "data-org-contextual-preview-root",
    "onPreviewPointerEnter",
    "onPreviewPointerLeave",
  ]) {
    if (!src.includes(marker)) {
      pushViolation(
        violations,
        "SCE-DS-GOV-A11Y-001",
        file,
        `Missing Organisation Builder preview WCAG 1.4.13 marker/handler: ${marker}.`,
      );
    }
  }
}

const PASSWORD_MUTATION_PATTERNS = [
  /\.update\s*\(\s*\{[^}]*password/i,
  /passwordHash\s*:\s*await\s+bcrypt/i,
  /user\.update\s*\([\s\S]*password/i,
];

function scanPasswordMutations(violations: SceGovernanceViolation[], file: string, src: string): void {
  const normalized = file.replace(/\\/g, "/");
  if (!normalized.startsWith("prisma/") && !normalized.startsWith("scripts/")) return;
  if (normalized.includes("password-management") || normalized.includes("break-glass")) return;
  if (normalized.includes("acceptance-sync-fixture-passwords")) return;
  if (normalized.includes("acceptance-verify-fixture-passwords")) return;
  if (normalized.includes("bootstrap-admin")) return;
  if (normalized.includes("restore-protected-credential")) return;
  if (normalized.includes("emergency-restore")) return;

  for (const pattern of PASSWORD_MUTATION_PATTERNS) {
    if (pattern.test(src)) {
      pushViolation(
        violations,
        "SCE-DS-GOV-SECURITY-001",
        file,
        "Possible existing-user password mutation outside explicit password-management flow.",
      );
      break;
    }
  }
}

function scanGenericErrorNormalization(
  violations: SceGovernanceViolation[],
  file: string,
  src: string,
): void {
  if (file.startsWith("lib/design-system/")) return;
  if (!file.includes("components/sce/") && !file.includes("components/admin/")) return;
  if (!src.includes("Interner Fehler")) return;
  if (src.includes("SCE_ACTIONABLE_ERROR") || src.includes("actionable")) return;
  if (file.includes("__tests__")) return;
  pushViolation(
    violations,
    "SCE-DS-GOV-ERROR-001",
    file,
    "Generic Interner Fehler string in SCE UI — prefer domain-aware actionable errors for new flows.",
  );
}

function scanUnknownDashboardCreateRoutes(violations: SceGovernanceViolation[], files: string[]): void {
  const allowed = new Set<string>([
    ...SCE_GOVERNANCE_DEEP_LINK_CREATE_ROUTES,
  ]);

  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    if (!normalized.includes("app/(admin)/dashboard/") || !normalized.endsWith("/new/page.tsx")) {
      continue;
    }
    if (
      SCE_GOVERNANCE_ACTIVITY_COMPOSER_ROUTE_PREFIXES.some((prefix) =>
        normalized.startsWith(prefix),
      )
    ) {
      continue;
    }
    if (isPathCoveredBySceDesignSystemException(normalized)) continue;
    if (allowed.has(normalized)) continue;
    pushViolation(
      violations,
      "SCE-DS-GOV-CREATE-001",
      file,
      "Undocumented /new create route — register deep-link fallback or typed exception before merging.",
    );
  }
}

function assertCanonicalActivityCardsExist(violations: SceGovernanceViolation[]): void {
  for (const path of SCE_GOVERNANCE_CANONICAL_ACTIVITY_CARD_PATHS) {
    try {
      statSync(join(ROOT, path));
    } catch {
      pushViolation(
        violations,
        "SCE-DS-GOV-ACTIVITY-001",
        path,
        "Canonical SCE activity card missing from repository.",
      );
    }
  }
}

export function runSceDesignSystemGovernance(options?: {
  root?: string;
  /** When set, only scan these relative paths (for unit tests). */
  files?: string[];
}): SceDesignSystemGovernanceRunResult {
  const started = performance.now();
  const violations: SceGovernanceViolation[] = [];
  const root = options?.root ?? ROOT;

  const files =
    options?.files?.map((f) => join(root, f)) ??
    walkRepoFiles(root).filter((abs) => {
      const r = rel(abs);
      return (
        r.startsWith("components/") ||
        r.startsWith("app/(admin)/") ||
        r.startsWith("lib/design-system/") ||
        r.startsWith("prisma/") ||
        r.startsWith("scripts/")
      );
    });

  for (const abs of files) {
    const file = rel(abs);
    let src: string;
    try {
      src = readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    scanCheckboxBaseline(violations, file, src);
    scanCreateTriggers(violations, file, src);
    scanPrimaryFullPageCreatePages(violations, file, src);
    scanFunctionalSurfaces(violations, file, src);
    scanWorkspaceAntiPatterns(violations, file, src);
    scanActivityParallelCards(violations, file, src);
    scanMagicZIndex(violations, file, src);
    scanPasswordMutations(violations, file, src);
    scanGenericErrorNormalization(violations, file, src);
  }

  scanOrgPreviewA11y(violations);
  scanUnknownDashboardCreateRoutes(
    violations,
    files.map((abs) => rel(abs)),
  );
  assertCanonicalActivityCardsExist(violations);

  const durationMs = Math.round(performance.now() - started);

  return {
    pass: violations.length === 0,
    violations,
    filesScanned: files.length,
    ruleCount: Object.keys(SCE_DESIGN_SYSTEM_GOVERNANCE_RULES).length,
    durationMs,
    metrics: {
      checkboxBaselinePaths: SCE_GOVERNANCE_CHECKBOX_BASELINE_PATHS.length,
      exceptionRegistryEntries: SCE_DESIGN_SYSTEM_EXCEPTION_REGISTRY.length,
    },
  };
}

export function formatSceGovernanceViolationsForCli(
  violations: SceGovernanceViolation[],
): string {
  return violations
    .map(
      (v) =>
        `[${v.ruleId}] ${v.file}\n  ${v.reason}\n  → ${v.suggestion}`,
    )
    .join("\n\n");
}
