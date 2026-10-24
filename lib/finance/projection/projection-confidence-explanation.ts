import type {
  ProjectionConfidenceLevel,
  ProjectionDataSufficiencyLevel,
  ProjectionMethodologyFamily,
} from "@/lib/finance/projection/projection-architecture-contract";

const CONFIDENCE_CODE_MESSAGES: Readonly<Record<string, string>> = {
  MULTI_YEAR_STABLE_PATTERN:
    "Die historischen Verläufe sind über mehrere Finanzjahre ähnlich.",
  MODERATE_PATTERN_DISPERSION:
    "Die historischen Verläufe unterscheiden sich teilweise zwischen den Jahren.",
  VOLATILE_HISTORICAL_PATTERN:
    "Die historischen Verläufe schwanken stark zwischen den Finanzjahren.",
  SINGLE_HISTORICAL_YEAR: "Es steht nur ein historisches Finanzjahr zur Verfügung.",
  HISTORICAL_PATTERN_DEFAULT: "Die Schätzung folgt dem erkannten historischen Verlauf.",
  LIMITED_EVIDENCE: "Die verfügbare Datenbasis ist begrenzt.",
  RUN_RATE_CONSERVATIVE:
    "Die Prognose basiert hauptsächlich auf dem bisherigen Verlauf des aktuellen Finanzjahres und enthält deshalb mehr Unsicherheit.",
  NO_PROJECTION:
    "Für diese Position liegen noch nicht genügend Daten für eine verlässliche automatische Prognose vor.",
};

/**
 * Structured German explanation for why confidence has its level — derived from persisted rationale codes.
 * Data sufficiency labels are separate; this answers Prognosesicherheit only.
 */
export function projectionConfidenceExplanation(input: {
  level: ProjectionConfidenceLevel;
  rationaleCodes: readonly string[];
  methodologyFamily: ProjectionMethodologyFamily;
  dataSufficiency: ProjectionDataSufficiencyLevel;
}): string | null {
  if (input.methodologyFamily === "NONE" || input.level === "NONE") {
    return CONFIDENCE_CODE_MESSAGES.NO_PROJECTION ?? null;
  }

  const sentences: string[] = [];
  for (const code of input.rationaleCodes) {
    const sentence = CONFIDENCE_CODE_MESSAGES[code];
    if (sentence && !sentences.includes(sentence)) {
      sentences.push(sentence);
    }
  }

  if (sentences.length > 0) {
    if (
      input.dataSufficiency === "SUFFICIENT" &&
      input.level === "MEDIUM" &&
      !sentences.some((s) => s.includes("unterscheiden"))
    ) {
      sentences.push(
        "Die Datenbasis ist ausreichend, die historischen Verläufe unterscheiden sich jedoch teilweise.",
      );
    }
    return sentences.join(" ");
  }

  switch (input.level) {
    case "HIGH":
      return "Die historischen Verläufe sind über mehrere Finanzjahre ähnlich und die aktuelle Datenbasis ist ausreichend.";
    case "MEDIUM":
      return "Die Datenbasis ist ausreichend, die historischen Verläufe unterscheiden sich jedoch teilweise.";
    case "LOW":
      return "Die Prognose enthält erhöhte Unsicherheit.";
    default:
      return null;
  }
}
