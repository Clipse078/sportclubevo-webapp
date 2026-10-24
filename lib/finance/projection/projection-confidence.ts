import type {
  ProjectionConfidenceLevel,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import type { ProjectionPatternStabilityAssessment } from "@/lib/finance/projection/projection-pattern-stability";

export type ProjectionAccountConfidence = {
  level: ProjectionConfidenceLevel;
  rationaleCodes: readonly string[];
};

export function assessProjectionAccountConfidence(input: {
  methodologyFamily: ProjectionMethodologyFamily;
  context: ProjectionEvidenceContext;
  patternStability: ProjectionPatternStabilityAssessment;
  historicalYearsUsed: number;
}): ProjectionAccountConfidence {
  if (input.methodologyFamily === "NONE") {
    return { level: "NONE", rationaleCodes: ["NO_PROJECTION"] };
  }

  if (input.methodologyFamily === "RUN_RATE") {
    const codes = ["RUN_RATE_CONSERVATIVE"];
    if (input.context.sufficiency.level === "LIMITED") {
      codes.push("LIMITED_EVIDENCE");
    }
    return { level: "LOW", rationaleCodes: codes };
  }

  if (input.methodologyFamily === "HISTORICAL_PATTERN") {
    const codes: string[] = [];
    let level: ProjectionConfidenceLevel = "MEDIUM";

    if (input.historicalYearsUsed >= 2 && input.patternStability.stability === "STABLE") {
      level = "HIGH";
      codes.push("MULTI_YEAR_STABLE_PATTERN");
    } else if (input.historicalYearsUsed === 1) {
      level = "LOW";
      codes.push("SINGLE_HISTORICAL_YEAR");
    } else if (input.patternStability.stability === "VOLATILE") {
      level = "LOW";
      codes.push("VOLATILE_HISTORICAL_PATTERN");
    } else if (input.patternStability.stability === "MODERATE") {
      level = "MEDIUM";
      codes.push("MODERATE_PATTERN_DISPERSION");
    } else {
      codes.push("HISTORICAL_PATTERN_DEFAULT");
    }

    if (input.context.sufficiency.level === "LIMITED") {
      if (level === "HIGH") level = "MEDIUM";
      codes.push("LIMITED_EVIDENCE");
    }

    return { level, rationaleCodes: codes };
  }

  return { level: "LOW", rationaleCodes: ["UNKNOWN_METHODOLOGY"] };
}

/** Worst-case rollup for version-level confidence (NONE is lowest). */
export const PROJECTION_CONFIDENCE_ORDER: readonly ProjectionConfidenceLevel[] = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
];

export function minConfidenceLevel(
  levels: readonly ProjectionConfidenceLevel[],
): ProjectionConfidenceLevel {
  if (levels.length === 0) return "NONE";
  let minIndex = PROJECTION_CONFIDENCE_ORDER.length - 1;
  for (const level of levels) {
    const idx = PROJECTION_CONFIDENCE_ORDER.indexOf(level);
    if (idx >= 0 && idx < minIndex) minIndex = idx;
  }
  return PROJECTION_CONFIDENCE_ORDER[minIndex]!;
}
