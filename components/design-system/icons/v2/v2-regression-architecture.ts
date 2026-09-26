/**
 * V2 regression guard plan — infrastructure hooks for future enforcement (V2-02+).
 *
 * V2-01 registers expectations only; guards remain migration-state aware.
 */

export type V2RegressionGuard = {
  id: string;
  description: string;
  migrationPhase: "V2-02" | "V2-03" | "V2-04" | "POST_MIGRATION";
  enforcement: "test" | "lint" | "audit-script" | "ci";
  migrationStateExpectation: string;
};

export const SCE_V2_REGRESSION_GUARDS: V2RegressionGuard[] = [
  {
    id: "CURRENTCOLOR_GUARD",
    description:
      "All canonical V2 UI masters use currentColor (no hard-coded brand fills/strokes in SVG or React geometry).",
    migrationPhase: "V2-02",
    enforcement: "test",
    migrationStateExpectation:
      "While v2ArtworkStatus=AWAITING_PRODUCT_OWNER_ARTWORK, assert V1 baseline unchanged; after artwork lands, fail on non-compliant V2 fingerprints.",
  },
  {
    id: "V1_USAGE_GUARD",
    description: "Prevent accidental V1 master geometry after a concept reaches V2 INTEGRATED status.",
    migrationPhase: "V2-03",
    enforcement: "test",
    migrationStateExpectation: "Manifest-driven allowlist per integrationStatus.",
  },
  {
    id: "EXPECTED_SLOT_GUARD",
    description:
      "Expected semantic icon-slot audit reports zero LEGACY_DOMAIN / MISSING_EXPECTED_ICON debt in governed surfaces.",
    migrationPhase: "V2-04",
    enforcement: "audit-script",
    migrationStateExpectation: "Baseline debt recorded in V2-01; reductions tracked per sprint.",
  },
  {
    id: "UTILITY_GUARD",
    description: "Lucide/utility boundary preserved — domain semantics cannot masquerade as utilities.",
    migrationPhase: "POST_MIGRATION",
    enforcement: "test",
    migrationStateExpectation: "Reuse LUCIDE_UTILITY_ALLOWLIST + semantic resolution.",
  },
  {
    id: "STATUS_GUARD",
    description: "Semantic status colors remain component/state-owned, not baked into domain masters.",
    migrationPhase: "V2-02",
    enforcement: "audit-script",
    migrationStateExpectation: "Color ownership audit must show STATUS_OWNED / STATE_OWNED for status glyphs.",
  },
  {
    id: "CONTENT_IDENTITY_GUARD",
    description: "Crests, avatars, logos, and uploaded media remain CONTENT_IDENTITY — never replaced by SCE domain icons.",
    migrationPhase: "POST_MIGRATION",
    enforcement: "test",
    migrationStateExpectation: "Slot classifier excludes legitimate content identity.",
  },
  {
    id: "MOBILE_GUARD",
    description: "Responsive/mobile alternative markup included in expected-slot coverage.",
    migrationPhase: "V2-04",
    enforcement: "audit-script",
    migrationStateExpectation: "responsiveMobile section of webapp audit + slot audit parity.",
  },
  {
    id: "OPTICAL_METADATA_GUARD",
    description: "V2 masters ship optical metadata (legibility tier, occupancy) in manifest.",
    migrationPhase: "V2-02",
    enforcement: "test",
    migrationStateExpectation: "Manifest rows updated when artwork supplied.",
  },
  {
    id: "FINGERPRINT_GUARD",
    description: "V2 artwork fingerprint protected alongside V1 baseline fingerprints.",
    migrationPhase: "V2-02",
    enforcement: "test",
    migrationStateExpectation: "replacementFingerprint populated on handoff merge.",
  },
];

export function summarizeV2RegressionPlan() {
  return {
    guardCount: SCE_V2_REGRESSION_GUARDS.length,
    byPhase: SCE_V2_REGRESSION_GUARDS.reduce<Record<string, number>>((acc, g) => {
      acc[g.migrationPhase] = (acc[g.migrationPhase] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
