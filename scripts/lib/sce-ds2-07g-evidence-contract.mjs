/**
 * SCE-DS2-07G batch-3 — independent verification dimensions and channel mapping.
 */
export const EVIDENCE_CONTRACT_VERSION = "2026-11-10-batch-3";

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

/** @param {RouteDimensionEvidence | null | undefined} dimensions */
export function isAuthenticatedVisualClosure(dimensions) {
  if (!dimensions) return false;
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
