import { describe, expect, it } from "vitest";
import {
  VENUE_SEMANTIC_LABEL_ATTR,
  VENUE_SEMANTIC_LABEL_COLORS,
  VENUE_SEMANTIC_LABELS,
  venueSemanticLabelKindForEventType,
} from "@/lib/infoboard/venue-semantic-label";
import { VENUE_COLUMN_COMPOSITION_CLASS } from "@/lib/infoboard/venue-column-composition";
import {
  TRAINING_PARTICIPANT_TEAM_CLAMP,
  TRAINING_TEAM_NAME_MIN_READABLE_REM,
} from "@/lib/infoboard/training-participant-density";
import { parseClampMinRem } from "@/lib/infoboard/venue-distance-typography";

describe("R11R1 semantic label contract", () => {
  it("SEMANTIC_LABEL_FAMILY lists all five venue labels", () => {
    expect(VENUE_SEMANTIC_LABELS).toEqual([
      "MATCH",
      "TRAINING",
      "TURNIER",
      "KABINE",
      "PLATZ",
    ]);
    expect(VENUE_SEMANTIC_LABEL_ATTR).toBe("data-semantic-label");
  });

  it("SEMANTIC_COLORS", () => {
    expect(VENUE_SEMANTIC_LABEL_COLORS.MATCH).toBe("#D83033");
    expect(VENUE_SEMANTIC_LABEL_COLORS.TRAINING).toBe("#1E5BC6");
    expect(VENUE_SEMANTIC_LABEL_COLORS.TURNIER).toBe("#E87C24");
    expect(VENUE_SEMANTIC_LABEL_COLORS.KABINE).toBe("#1849A6");
    expect(VENUE_SEMANTIC_LABEL_COLORS.PLATZ).toBe("#174D38");
  });

  it("maps publishing types to semantic label kinds", () => {
    expect(venueSemanticLabelKindForEventType("MATCH")).toBe("MATCH");
    expect(venueSemanticLabelKindForEventType("TRAINING")).toBe("TRAINING");
    expect(venueSemanticLabelKindForEventType("TOURNAMENT")).toBe("TURNIER");
  });

  it("VERTICAL_COMPOSITION exports composition class token", () => {
    expect(VENUE_COLUMN_COMPOSITION_CLASS).toBe("venueColumnComposition");
  });

  it("TRAINING_READABILITY dense tier respects minimum readable floor", () => {
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense)).toBeGreaterThanOrEqual(
      TRAINING_TEAM_NAME_MIN_READABLE_REM,
    );
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.spacious)).toBe(
      parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense),
    );
  });
});
