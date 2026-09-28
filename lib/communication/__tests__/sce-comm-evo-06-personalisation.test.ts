import { describe, expect, it } from "vitest";
import {
  COMMUNICATION_PERSONALISATION_FIELDS,
  getPersonalisationFieldDefinition,
} from "@/lib/communication/personalisation/field-registry";
import {
  extractPersonalisationTokens,
  extractUnknownPersonalisationKeys,
} from "@/lib/communication/personalisation/token-parser";
import { formatFullPostalAddress } from "@/lib/communication/personalisation/formatters";
import {
  renderPersonalisationText,
  validatePersonalisationTemplate,
} from "@/lib/communication/personalisation/personalisation-engine";
import type { PersonalisationRenderScope } from "@/lib/communication/personalisation/resolve-field-values";
import { resolveFieldAvailabilityForContext } from "@/lib/communication/personalisation/field-availability";

function baseScope(overrides?: Partial<PersonalisationRenderScope>): PersonalisationRenderScope {
  const person = {
    id: "p1",
    firstName: "James",
    lastName: "Duijster",
    displayName: null,
    email: "j@example.com",
    phone: "+41",
    userId: "u1",
  };
  return {
    tenantId: "tenant-a",
    context: {
      tenantId: "tenant-a",
      tenantName: "FC Allschwil",
      tenantEmail: "info@club.ch",
      timeZone: "Europe/Zurich",
      locale: "de-CH",
      contextRef: { kind: "ORGANISATION", tenantId: "tenant-a" },
      contextTeamId: null,
      contextTeamName: null,
      contextTeamShortName: null,
      contextTeamAgeGroup: null,
      contextTeamGender: null,
      orgUnitName: null,
      event: null,
      activeSeasonName: "2025/26",
      activeSeasonStart: new Date("2025-08-01"),
      activeSeasonEnd: new Date("2026-07-31"),
    },
    contextRef: { kind: "ORGANISATION", tenantId: "tenant-a" },
    recipient: person,
    deliveryPerson: person,
    subjectPerson: person,
    guardianPerson: null,
    viaGuardianSubstitution: false,
    senderPerson: person,
    senderDisplayName: "FC Allschwil",
    senderEmail: "info@club.ch",
    communicationId: "comm-1",
    communicationKind: "ANNOUNCEMENT",
    allowContactFields: true,
    at: new Date("2026-10-05T12:00:00.000Z"),
    ...overrides,
  };
}

describe("SCE-COMM-EVO-06 personalisation registry", () => {
  it("has unique keys and known categories", () => {
    const keys = new Set<string>();
    for (const field of COMMUNICATION_PERSONALISATION_FIELDS) {
      expect(keys.has(field.key)).toBe(false);
      keys.add(field.key);
      expect(field.labelDe.length).toBeGreaterThan(0);
    }
    expect(getPersonalisationFieldDefinition("first_name")?.implemented).toBe(true);
  });

  it("rejects unknown tokens in validation", () => {
    const result = validatePersonalisationTemplate({
      bodyText: "Hallo <not_a_real_field>",
      contextRef: { kind: "ORGANISATION", tenantId: "t1" },
    });
    expect(result.ok).toBe(false);
    expect(result.unknownTokens).toContain("not_a_real_field");
  });

  it("marks match_opponent as context required without event", () => {
    const def = getPersonalisationFieldDefinition("match_opponent")!;
    expect(
      resolveFieldAvailabilityForContext(def, { kind: "ORGANISATION", tenantId: "t1" }, null),
    ).toBe("CONTEXT_REQUIRED");
  });
});

describe("SCE-COMM-EVO-06 token parser", () => {
  it("parses fallback modifier", () => {
    const tokens = extractPersonalisationTokens('Hallo <first_name|fallback="Mitglied">');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.missingPolicy).toBe("REPLACEMENT");
    expect(tokens[0]?.fallbackReplacement).toBe("Mitglied");
  });

  it("does not treat arbitrary paths as tokens", () => {
    expect(extractUnknownPersonalisationKeys("person.firstName")).toEqual([]);
  });
});

describe("SCE-COMM-EVO-06 formatters", () => {
  it("formats full address without malformed commas", () => {
    expect(formatFullPostalAddress({ street: "Hauptstrasse", postalCode: "4123", city: "Allschwil" })).toBe(
      "Hauptstrasse\n4123 Allschwil",
    );
    expect(formatFullPostalAddress({ street: "", postalCode: "", city: "" })).toBeNull();
  });
});

describe("SCE-COMM-EVO-06 rendering", () => {
  it("renders recipient-specific first name", async () => {
    const scopeA = baseScope();
    const scopeB = baseScope({
      deliveryPerson: {
        id: "p2",
        firstName: "Anna",
        lastName: "Meier",
        displayName: null,
        email: null,
        phone: null,
        userId: "u2",
      },
      recipient: {
        id: "p2",
        firstName: "Anna",
        lastName: "Meier",
        displayName: null,
        email: null,
        phone: null,
        userId: "u2",
      },
    });

    const a = await renderPersonalisationText({ template: "Hallo <first_name>", scope: scopeA });
    const b = await renderPersonalisationText({ template: "Hallo <first_name>", scope: scopeB });
    expect(a.text).toBe("Hallo James");
    expect(b.text).toBe("Hallo Anna");
  });

  it("applies replacement fallback", async () => {
    const scope = baseScope({
      deliveryPerson: {
        id: "p3",
        firstName: "",
        lastName: "X",
        displayName: null,
        email: null,
        phone: null,
        userId: "u3",
      },
      recipient: {
        id: "p3",
        firstName: "",
        lastName: "X",
        displayName: null,
        email: null,
        phone: null,
        userId: "u3",
      },
    });
    const result = await renderPersonalisationText({
      template: '<first_name|fallback="Mitglied">',
      scope,
    });
    expect(result.text).toBe("Mitglied");
  });

  it("escapes unknown token without execution", async () => {
    const result = await renderPersonalisationText({
      template: "Hi <evil>",
      scope: baseScope(),
    });
    expect(result.text).toContain("<evil>");
    expect(result.unknownTokens).toContain("evil");
  });
});

describe("SCE-COMM-EVO-06 pitch ambiguity policy", () => {
  it("documents single vs list pitch semantics via registry policy", () => {
    const single = getPersonalisationFieldDefinition("pitch_allocation")!;
    const list = getPersonalisationFieldDefinition("pitch_allocations")!;
    expect(single.defaultMissingPolicy).toBe("BLANK");
    expect(list.valueType).toBe("LIST");
  });
});
