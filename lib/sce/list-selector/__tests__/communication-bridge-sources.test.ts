import { describe, expect, it } from "vitest";
import {
  parseSelectorSourceTypesParam,
  parseSelectorSourceTypesParamStrict,
  selectorTypeToCommunicationSearchKind,
} from "@/lib/sce/list-selector/communication-bridge";

describe("parseSelectorSourceTypesParam", () => {
  it("parses orgUnit,team,role exactly as serialized by the client adapter", () => {
    const types = parseSelectorSourceTypesParam("orgUnit,team,role");
    expect(types).toEqual(["ORG_UNIT", "TEAM", "ROLE"]);
    expect(types?.map((t) => selectorTypeToCommunicationSearchKind(t))).toEqual([
      "orgUnit",
      "team",
      "role",
    ]);
  });

  it("returns null for unknown-only tokens", () => {
    expect(parseSelectorSourceTypesParam("foo,bar")).toBeNull();
  });

  it("strict mode reports invalid tokens", () => {
    const parsed = parseSelectorSourceTypesParamStrict("orgUnit,team,bogus");
    expect(parsed.types).toEqual(["ORG_UNIT", "TEAM"]);
    expect(parsed.invalidTokens).toEqual(["bogus"]);
  });
});
