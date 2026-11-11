/**
 * SCE-DS2-07G — independent verification dimensions and channel mapping.
 * Batch 8 extends accessibility incomplete taxonomy, functional expectations, and closure rules.
 */
export const EVIDENCE_CONTRACT_VERSION = "2026-11-11-batch-11";

/** Axe rules that require human or keyboard supplement — zero violations alone is insufficient. */
export const AXE_INCOMPLETE_MANUAL_REVIEW_RULES = new Set([
  "color-contrast",
  "css-orientation-lock",
  "focus-order-semantics",
  "hidden-content",
  "landmark-complementary-is-top-level",
  "link-in-text-block",
  "scrollable-region-focusable",
  "meta-viewport",
  "p-as-heading",
  "table-duplicate-name",
]);

/** Incomplete rules that keyboard/focus probe can partially satisfy when violations are zero. */
export const AXE_INCOMPLETE_KEYBOARD_SUPPLEMENT_RULES = new Set([
  "frame-tested",
  "focus-order-semantics",
  "scrollable-region-focusable",
]);

/** @typedef {"PASS" | "FAIL" | "PENDING" | "BLOCKED" | "NOT_APPLICABLE"} DimensionStatus */

/** @typedef {{ status: DimensionStatus, reason?: string, details?: string[] }} DimensionResult */

/** @typedef {{ desktop?: DimensionResult, compactDesktop?: DimensionResult, tablet?: DimensionResult, mobile?: DimensionResult }} ResponsiveViewportMap */

/**
 * @typedef {object} RouteDimensionEvidence
 * @property {DimensionResult} authentication
 * @property {DimensionResult} visual
 * @property {DimensionResult & { viewports?: ResponsiveViewportMap, screenshotReviewed?: boolean }} responsive
 * @property {DimensionResult & { axeViolations?: number, axeIncomplete?: number }} accessibility
 * @property {DimensionResult} functional
 * @property {DimensionResult} authorization
 */

export const VIEWPORT_KEYS = ["desktop", "compactDesktop", "tablet", "mobile"];

/** @param {DimensionStatus | undefined} status */
export function dimensionToChannelStatus(status) {
  switch (status) {
    case "PASS":
      return "VERIFIED";
    case "BLOCKED":
      return "BLOCKED";
    case "NOT_APPLICABLE":
      return "NOT_APPLICABLE";
    default:
      return "PENDING";
  }
}

/** @param {RouteDimensionEvidence | null | undefined} dimensions */
export function responsiveViewportStatus(dimensions, viewportKey) {
  const viewport = dimensions?.responsive?.viewports?.[viewportKey];
  return dimensionToChannelStatus(viewport?.status);
}

/**
 * @param {{ violations: number, incomplete: number, incompleteSummaries?: string[], keyboardProbeFailures?: string[] }} axe
 * @param {{ responsivePass: boolean, authBlocked: boolean }} context
 */
export function resolveAccessibilityDimension(axe, context) {
  const keyboardProbeFailures = axe.keyboardProbeFailures ?? [];
  const incompleteSummaries = axe.incompleteSummaries ?? [];
  const classification = classifyAxeIncomplete(incompleteSummaries);

  if (context.authBlocked) {
    return {
      status: /** @type {const} */ ("BLOCKED"),
      axeViolations: axe.violations,
      axeIncomplete: axe.incomplete,
      reason: "Authorization blocked",
      details: incompleteSummaries,
      incompleteClassification: classification,
    };
  }
  if (axe.violations > 0) {
    return {
      status: /** @type {const} */ ("FAIL"),
      axeViolations: axe.violations,
      axeIncomplete: axe.incomplete,
      reason: `axe violations: ${axe.violationSummaries?.join(", ") ?? axe.violations}`,
      details: [...(axe.violationSummaries ?? []), ...incompleteSummaries.map((s) => `incomplete:${s}`)],
      incompleteClassification: classification,
    };
  }
  if (keyboardProbeFailures.length > 0) {
    return {
      status: /** @type {const} */ ("FAIL"),
      axeViolations: 0,
      axeIncomplete: axe.incomplete,
      reason: `keyboard focus probe failed: ${keyboardProbeFailures.join("; ")}`,
      details: [...incompleteSummaries.map((s) => `incomplete:${s}`), ...keyboardProbeFailures],
      incompleteClassification: classification,
    };
  }
  if (axe.incomplete > 0) {
    return {
      status: /** @type {const} */ ("PENDING"),
      axeViolations: 0,
      axeIncomplete: axe.incomplete,
      reason: `axe incomplete rules (${classification.manualReview.length} manual, ${classification.keyboardSupplement.length} keyboard supplement): ${axe.incomplete}`,
      details: incompleteSummaries.map((s) => `incomplete:${s}`),
      incompleteClassification: classification,
    };
  }
  if (!context.responsivePass) {
    return {
      status: /** @type {const} */ ("PENDING"),
      axeViolations: 0,
      axeIncomplete: 0,
      reason: "axe clean; responsive probe incomplete",
      details: [],
      incompleteClassification: classification,
    };
  }
  return {
    status: /** @type {const} */ ("PASS"),
    axeViolations: 0,
    axeIncomplete: 0,
    reason: "axe-core wcag2aa scan clean; keyboard focus probe clean on desktop viewport",
    details: [],
    incompleteClassification: classification,
  };
}

/**
 * @param {string[]} incompleteSummaries e.g. "color-contrast:serious"
 */
export function classifyAxeIncomplete(incompleteSummaries) {
  const manualReview = [];
  const keyboardSupplement = [];
  const unclassified = [];
  for (const entry of incompleteSummaries) {
    const ruleId = entry.split(":")[0] ?? entry;
    if (AXE_INCOMPLETE_MANUAL_REVIEW_RULES.has(ruleId)) {
      manualReview.push(ruleId);
    } else if (AXE_INCOMPLETE_KEYBOARD_SUPPLEMENT_RULES.has(ruleId)) {
      keyboardSupplement.push(ruleId);
    } else {
      unclassified.push(ruleId);
    }
  }
  return { manualReview, keyboardSupplement, unclassified };
}

/**
 * @param {{ pageArchetype: string, urlPattern: string, intercept: boolean }} route
 * @param {{ hasMainLandmark: boolean, hasPrimaryHeading: boolean, interactiveCount: number, formSubmitPresent: boolean, formCheckSkipped: boolean } | null} probe
 * @param {{ authBlocked: boolean }} context
 */
export function resolveFunctionalDimension(route, probe, context) {
  if (context.authBlocked) {
    return { status: /** @type {const} */ ("BLOCKED"), reason: "Authorization blocked", details: [] };
  }
  if (route.pageArchetype === "future-module") {
    return {
      status: /** @type {const} */ ("NOT_APPLICABLE"),
      reason:
        "Future-module placeholder surface; mutation and workflow verification outside DS2-07G read-only scope",
      details: ["functionalClass:FUTURE_MODULE_PLACEHOLDER"],
    };
  }
  if (route.intercept) {
    return {
      status: /** @type {const} */ ("NOT_APPLICABLE"),
      reason: "Parallel intercept slot; full-page workflow verification not applicable (modal pass tracked separately)",
      details: ["functionalClass:INTERCEPT_SLOT"],
    };
  }
  if (!probe) {
    return { status: /** @type {const} */ ("PENDING"), reason: "Functional probe not executed", details: [] };
  }
  const workspaceLandmark =
    probe.hasMainLandmark || probe.hasWorkspaceChromeEquivalent === true;
  const readOnlyOk =
    workspaceLandmark && probe.hasPrimaryHeading && probe.interactiveCount > 0;
  if (probe.formCheckSkipped) {
    return readOnlyOk
      ? {
          status: /** @type {const} */ ("PASS"),
          reason: "Read-only functional smoke: workspace landmark, heading, interactive controls",
          details: [JSON.stringify(probe), "functionalClass:READ_ONLY_SMOKE"],
        }
      : {
          status: /** @type {const} */ ("PENDING"),
          reason: "Read-only route missing workspace landmark, heading, or interactive controls",
          details: [JSON.stringify(probe), "functionalClass:READ_ONLY_SMOKE"],
        };
  }
  if (!probe.formSubmitPresent) {
    return {
      status: /** @type {const} */ ("PENDING"),
      reason: "Form route missing submit control (read-only probe); mutation workflow not verified",
      details: [JSON.stringify(probe), "functionalClass:MUTATION_WORKFLOW"],
    };
  }
  return readOnlyOk
    ? {
        status: /** @type {const} */ ("PASS"),
        reason: "Form route rendered with submit affordance; read-only smoke passed",
        details: [JSON.stringify(probe), "functionalClass:FORM_RENDER_SMOKE"],
      }
    : {
        status: /** @type {const} */ ("PENDING"),
        reason: "Form route missing workspace landmark or heading",
        details: [JSON.stringify(probe), "functionalClass:FORM_RENDER_SMOKE"],
      };
}

/** @param {RouteDimensionEvidence | null | undefined} dimensions */
export function isAuthenticatedVisualClosure(dimensions) {
  if (!dimensions) return false;
  if (dimensions.visual?.status !== "PASS" || dimensions.visual?.screenshotReviewed !== true) {
    return false;
  }
  const required = [
    dimensions.authentication?.status,
    dimensions.authorization?.status,
    dimensions.visual?.status,
    dimensions.accessibility?.status,
    dimensions.functional?.status,
  ];
  if (!required.every((s) => s === "PASS" || s === "NOT_APPLICABLE")) return false;
  for (const key of VIEWPORT_KEYS) {
    const vp = dimensions.responsive?.viewports?.[key]?.status;
    if (vp !== "PASS" && vp !== "NOT_APPLICABLE") return false;
  }
  return true;
}

/** @param {import("./sce-ds2-07g-verification.mjs").SceEvidenceRow | Record<string, unknown>} record */
export function extractDimensions(record) {
  if (record?.dimensions && typeof record.dimensions === "object") {
    return /** @type {RouteDimensionEvidence} */ (record.dimensions);
  }
  return migrateLegacyEvidenceRow(record);
}

/**
 * Batch-2 rows marked accessibility/functional VERIFIED without axe or workflow proof.
 * @param {Record<string, unknown>} record
 * @returns {RouteDimensionEvidence}
 */
export function migrateLegacyEvidenceRow(record) {
  const blocked = Boolean(record.blocked);
  const legacyVerified = record.authenticatedVisual === "VERIFIED" && !blocked;
  const authStatus = blocked ? "BLOCKED" : legacyVerified ? "PASS" : "PENDING";
  const defectList = Array.isArray(record.defects) ? record.defects : [];
  const authzStatus = blocked
    ? "BLOCKED"
    : defectList.some((d) => String(d.summary).includes("HTTP 403"))
      ? "FAIL"
      : legacyVerified
        ? "PASS"
        : "PENDING";

  /** @type {ResponsiveViewportMap} */
  const viewports = {};
  for (const key of VIEWPORT_KEYS) {
    const legacy = record[key];
    const pass = legacy === "VERIFIED";
    viewports[key] = {
      status: blocked ? "BLOCKED" : pass ? "PASS" : "PENDING",
      reason: pass ? undefined : "No responsive evidence",
    };
  }

  return {
    authentication: {
      status: authStatus,
      reason: authStatus === "PASS" ? "Authenticated session reached route" : undefined,
    },
    authorization: {
      status: authzStatus,
      reason: authzStatus === "PASS" ? "No 401/403 on probe" : undefined,
    },
    visual: {
      status: "PENDING",
      reason:
        legacyVerified
          ? "Batch-2 screenshots exist; independent visual review required (layout heuristics not yet run)"
          : "No visual evidence",
      screenshotReviewed: false,
    },
    responsive: {
      status:
        VIEWPORT_KEYS.every((k) => viewports[k]?.status === "PASS") && !blocked
          ? "PASS"
          : blocked
            ? "BLOCKED"
            : "PENDING",
      viewports,
      reason: legacyVerified ? "Viewport HTTP + landmark checks from batch 2" : undefined,
    },
    accessibility: {
      status: "PENDING",
      reason: legacyVerified
        ? "Batch 2 inferred PASS from navigation; reassigned pending axe-core (batch 3 contract)"
        : "No accessibility evidence",
    },
    functional: {
      status: "PENDING",
      reason: legacyVerified
        ? "Batch 2 inferred PASS from navigation; reassigned pending read-only workflow checks"
        : "No functional evidence",
    },
  };
}

/** @param {RouteDimensionEvidence} dimensions */
export function deriveLegacyChannelsFromDimensions(dimensions) {
  const authenticatedVisual = isAuthenticatedVisualClosure(dimensions)
    ? "VERIFIED"
    : dimensions.authentication?.status === "BLOCKED" || dimensions.authorization?.status === "BLOCKED"
      ? "BLOCKED"
      : "PENDING";

  return {
    desktop: responsiveViewportStatus(dimensions, "desktop"),
    compactDesktop: responsiveViewportStatus(dimensions, "compactDesktop"),
    tablet: responsiveViewportStatus(dimensions, "tablet"),
    mobile: responsiveViewportStatus(dimensions, "mobile"),
    accessibility: dimensionToChannelStatus(dimensions.accessibility?.status),
    functional: dimensionToChannelStatus(dimensions.functional?.status),
    authenticatedVisual,
  };
}

/** @param {DimensionResult} base */
export function emptyDimensions(base = "PENDING") {
  const pending = /** @type {const} */ (base);
  return {
    authentication: { status: pending, reason: "Not probed" },
    authorization: { status: pending, reason: "Not probed" },
    visual: { status: pending, reason: "Not probed", screenshotReviewed: false },
    responsive: {
      status: pending,
      viewports: Object.fromEntries(VIEWPORT_KEYS.map((k) => [k, { status: pending }])),
    },
    accessibility: { status: pending, reason: "Not probed" },
    functional: { status: pending, reason: "Not probed" },
  };
}
