import { describe, expect, it } from "vitest";
import {
  buildCommunicationAudienceSpec,
  communicationAudienceSelectionIsEmpty,
  emptyCommunicationAudienceSelection,
  inferCommunicationAudienceSelection,
} from "@/lib/communication/audience/communication-audience-selection";
import { audienceSpecIsDynamicAtDispatch } from "@/lib/communication/audience/audience-dynamic-notice";
import { summarizeCommunicationAudienceSelection } from "@/lib/communication/audience/human-audience-summary";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";

describe("SCE-COMM-EVO-03 audience selection", () => {
  it("builds whole organisation spec", () => {
    const spec = buildCommunicationAudienceSpec({
      ...emptyCommunicationAudienceSelection(),
      wholeOrganisation: true,
    });
    expect(spec.components[0]?.structural?.wholeOrganisation).toBe(true);
    expect(validateCommunicationAudienceSpec(spec)).toBeNull();
  });

  it("UNIONs structural selectors in one component", () => {
    const spec = buildCommunicationAudienceSpec({
      ...emptyCommunicationAudienceSelection(),
      teamIds: ["t1"],
      roleIds: ["r1"],
    });
    expect(spec.composition).toBe("UNION");
    expect(spec.components).toHaveLength(1);
    expect(spec.components[0]?.structural?.teamIds).toEqual(["t1"]);
    expect(spec.components[0]?.structural?.roleIds).toEqual(["r1"]);
  });

  it("adds one component per saved target group", () => {
    const spec = buildCommunicationAudienceSpec({
      ...emptyCommunicationAudienceSelection(),
      targetGroupIds: ["g1", "g2"],
    });
    expect(spec.components).toHaveLength(2);
    expect(spec.components[0]?.savedTargetGroupIds).toEqual(["g1"]);
  });

  it("round-trips infer for mixed selection", () => {
    const original = {
      ...emptyCommunicationAudienceSelection(),
      orgUnitIds: ["ou1"],
      personIds: ["p1"],
      targetGroupIds: ["tg1"],
    };
    const spec = buildCommunicationAudienceSpec(original);
    const inferred = inferCommunicationAudienceSelection(spec);
    expect(inferred.orgUnitIds).toEqual(["ou1"]);
    expect(inferred.personIds).toEqual(["p1"]);
    expect(inferred.targetGroupIds).toEqual(["tg1"]);
  });

  it("human summary uses UNION wording", () => {
    const summary = summarizeCommunicationAudienceSelection({
      selection: {
        ...emptyCommunicationAudienceSelection(),
        teamIds: ["t1"],
        roleIds: ["r1"],
      },
      labels: {
        orgUnits: {},
        teams: { t1: "Junioren F" },
        roles: { r1: "Trainer" },
        targetGroups: {},
        persons: {},
      },
    });
    expect(summary).toContain("Junioren F");
    expect(summary).toContain("Trainer");
    expect(summary).toContain(" oder ");
  });

  it("flags dynamic audiences", () => {
    expect(
      audienceSpecIsDynamicAtDispatch(
        buildCommunicationAudienceSpec({
          ...emptyCommunicationAudienceSelection(),
          wholeOrganisation: true,
        }),
      ),
    ).toBe(true);
    expect(
      audienceSpecIsDynamicAtDispatch(
        buildCommunicationAudienceSpec({
          ...emptyCommunicationAudienceSelection(),
          personIds: ["p1"],
        }),
      ),
    ).toBe(false);
  });

  it("detects empty selection", () => {
    expect(communicationAudienceSelectionIsEmpty(emptyCommunicationAudienceSelection())).toBe(true);
    expect(
      communicationAudienceSelectionIsEmpty({
        ...emptyCommunicationAudienceSelection(),
        teamIds: ["t1"],
      }),
    ).toBe(false);
  });
});
