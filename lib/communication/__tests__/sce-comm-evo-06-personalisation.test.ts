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
import { buildPersonalisationToken } from "@/lib/communication/personalisation/build-personalisation-token";
import type { LoadedPersonalisationEventContext } from "@/lib/communication/personalisation/load-personalisation-context";

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

describe("SCE-COMM-EVO-06 token builder (UX)", () => {
  it("builds plain and fallback tokens without manual syntax", () => {
    expect(
      buildPersonalisationToken({
        key: "first_name",
        missingPolicy: "BLANK",
        defaultMissingPolicy: "BLANK",
      }),
    ).toBe("<first_name>");
    expect(
      buildPersonalisationToken({
        key: "first_name",
        missingPolicy: "REPLACEMENT",
        fallbackText: "Mitglied",
        defaultMissingPolicy: "BLANK",
      }),
    ).toBe('<first_name|fallback="Mitglied">');
    expect(
      buildPersonalisationToken({
        key: "first_name",
        missingPolicy: "BLOCK_SEND",
        defaultMissingPolicy: "BLANK",
      }),
    ).toBe("<first_name|policy=block>");
  });
});

function eventScope(
  event: LoadedPersonalisationEventContext,
  contextRef: PersonalisationRenderScope["contextRef"],
): PersonalisationRenderScope {
  return baseScope({
    contextRef,
    context: {
      ...baseScope().context,
      contextRef,
      event,
    },
  });
}

describe("SCE-COMM-EVO-06 location and pitch acceptance", () => {
  const trainingEvent: LoadedPersonalisationEventContext = {
    eventId: "ev-tr",
    type: "TRAINING",
    title: "Training",
    location: "Sportanlage Heim",
    startAt: new Date("2026-10-05T17:00:00.000Z"),
    endAt: null,
    meetingTime: null,
    opponentName: null,
    competitionLabel: null,
    homeAway: "HOME",
    pitchCode: "STADION",
    homeDressingRoomCode: null,
    awayDressingRoomCode: null,
    participationResponseDueAt: null,
    teamId: "team-1",
    teamName: "F2",
    teamShortName: null,
    teamAgeGroup: null,
    teamGender: null,
    seasonId: null,
    seasonName: null,
    seasonStart: null,
    seasonEnd: null,
    tournamentPitchLabels: [],
    tournamentDressingRoomLabels: [],
  };

  it("HOME TRAINING exposes location and pitch in render", async () => {
    const ctx = { kind: "EVENT" as const, eventId: "ev-tr" };
    expect(
      resolveFieldAvailabilityForContext(
        getPersonalisationFieldDefinition("training_location")!,
        ctx,
        "TRAINING",
      ),
    ).toBe("AVAILABLE");
    const scope = eventScope(trainingEvent, ctx);
    const body = await renderPersonalisationText({
      template: "Ort: <training_location>, Platz: <training_pitch>",
      scope,
    });
    expect(body.text).toContain("Sportanlage Heim");
    expect(body.text).toContain("Stadion");
  });

  it("HOME MATCH resolves home pitch", async () => {
    const matchEvent = { ...trainingEvent, eventId: "ev-m", type: "MATCH", homeAway: "HOME" };
    const ctx = { kind: "EVENT" as const, eventId: "ev-m" };
    const body = await renderPersonalisationText({
      template: "<match_location> · <match_pitch>",
      scope: eventScope(matchEvent, ctx),
    });
    expect(body.text).toContain("Sportanlage Heim");
    expect(body.text).toContain("Stadion");
  });

  it("AWAY MATCH uses away location and omits home pitch", async () => {
    const awayEvent = {
      ...trainingEvent,
      eventId: "ev-away",
      type: "MATCH",
      homeAway: "AWAY",
      location: "Auswärtsarena",
      pitchCode: "STADION",
    };
    const ctx = { kind: "EVENT" as const, eventId: "ev-away" };
    const body = await renderPersonalisationText({
      template: "<match_location>|<match_pitch>",
      scope: eventScope(awayEvent, ctx),
    });
    expect(body.text).toContain("Auswärtsarena");
    expect(body.text).toBe("Auswärtsarena|");
  });

  it("HOME TOURNAMENT lists multiple pitches", async () => {
    const tournamentEvent = {
      ...trainingEvent,
      eventId: "ev-t",
      type: "TOURNAMENT",
      pitchCode: null,
      tournamentPitchLabels: ["Platz A", "Platz B"],
    };
    const ctx = { kind: "EVENT" as const, eventId: "ev-t" };
    expect(
      resolveFieldAvailabilityForContext(
        getPersonalisationFieldDefinition("tournament_pitches")!,
        ctx,
        "TOURNAMENT",
      ),
    ).toBe("AVAILABLE");
    const body = await renderPersonalisationText({
      template: "<tournament_pitches>",
      scope: eventScope(tournamentEvent, ctx),
    });
    expect(body.text).toContain("Platz A");
    expect(body.text).toContain("Platz B");
  });
});

describe("SCE-COMM-EVO-06 guardian acceptance", () => {
  it("renders guardian vs child first names from distinct identities", async () => {
    const guardian = {
      id: "g1",
      firstName: "Maria",
      lastName: "Muster",
      displayName: null,
      email: "m@example.com",
      phone: null,
      userId: "ug1",
    };
    const child = {
      id: "c1",
      firstName: "Leo",
      lastName: "Muster",
      displayName: null,
      email: null,
      phone: null,
      userId: null,
    };
    const scope = baseScope({
      deliveryPerson: guardian,
      recipient: guardian,
      subjectPerson: child,
      guardianPerson: guardian,
      viaGuardianSubstitution: true,
    });
    const result = await renderPersonalisationText({
      template: "Hallo <guardian_first_name>, <child_first_name>",
      scope,
    });
    expect(result.text).toBe("Hallo Maria, Leo");
  });
});
