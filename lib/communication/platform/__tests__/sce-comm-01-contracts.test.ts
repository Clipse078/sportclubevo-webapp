import { describe, expect, it } from "vitest";
import {
  COMMUNICATION_KINDS,
  isCommunicationKind,
} from "@/lib/communication/platform/communication-kinds";
import {
  validateCommunicationContextRef,
  type CommunicationContextRef,
} from "@/lib/communication/platform/communication-context";
import {
  CHANNEL_SUPPORTS_DELIVERED_CONFIRMATION,
  isCommunicationChannel,
} from "@/lib/communication/platform/channels";
import {
  canTransitionRecipientEngagement,
  isRecipientEngagementState,
} from "@/lib/communication/platform/engagement";
import {
  DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY,
  isCommunicationPreferenceCategory,
} from "@/lib/communication/platform/preference-categories";
import {
  applyExplicitPersonIncludeExclude,
  intersectPersonIdSets,
  unionPersonIdSets,
  validateCommunicationAudienceSpec,
} from "@/lib/communication/platform/audience/zielgruppe-validation";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  intersectAudienceWithSenderScope,
  resolveEffectiveRecipients,
  type SenderCommunicationScope,
} from "@/lib/communication/platform/authorization/communication-authorization";
import { defaultTeamOperationalAudience } from "@/lib/communication/platform/seams/team-communication-seam";
import { EVENT_PRESET_PARTICIPATION_FILTER } from "@/lib/communication/platform/seams/event-communication-seam";

describe("SCE-COMM-01 platform contracts", () => {
  it("communication kinds are stable programme enums", () => {
    expect(COMMUNICATION_KINDS).toContain("CAMPAIGN");
    expect(isCommunicationKind("MESSAGE")).toBe(true);
    expect(isCommunicationKind("CHAT")).toBe(false);
  });

  it("validates communication context typing and tenant integrity for organisation context", () => {
    const ctx: CommunicationContextRef = { kind: "ORGANISATION", tenantId: "tenant-a" };
    expect(validateCommunicationContextRef("tenant-a", ctx)).toBeNull();
    expect(validateCommunicationContextRef("tenant-b", ctx)).toBe("MISSING_TENANT");
    expect(
      validateCommunicationContextRef("tenant-a", { kind: "TEAM", teamId: "" }),
    ).toBe("EMPTY_REFERENCE_ID");
  });

  it("channel typing and delivery semantics", () => {
    expect(isCommunicationChannel("PUSH")).toBe(true);
    expect(isCommunicationChannel("SMS")).toBe(false);
    expect(CHANNEL_SUPPORTS_DELIVERED_CONFIRMATION.IN_APP).toBe(true);
    expect(CHANNEL_SUPPORTS_DELIVERED_CONFIRMATION.EMAIL).toBe(false);
  });

  it("engagement states are distinct from delivery", () => {
    expect(isRecipientEngagementState("READ")).toBe(true);
    expect(canTransitionRecipientEngagement("DELIVERED", "READ")).toBe(true);
    expect(canTransitionRecipientEngagement("RESPONDED", "READ")).toBe(false);
  });

  it("preference categories are separate from audience membership", () => {
    expect(isCommunicationPreferenceCategory("TEAM_OPERATIONAL")).toBe(true);
    expect(DEFAULT_CATEGORY_CHANNEL_ELIGIBILITY.SPONSOR_COMMERCIAL).not.toContain("PUSH");
  });

  it("validates Zielgruppe definitions with structural targets and dynamic rules", () => {
    const valid: CommunicationAudienceSpec = {
      composition: "UNION",
      components: [
        {
          structural: { teamIds: ["team-1"] },
          savedTargetGroupIds: ["tg-1"],
          dynamicRule: {
            type: "intersection",
            clauses: [
              { type: "roleKeys", value: ["trainer"] },
              { type: "teamIds", value: ["team-1"] },
            ],
          },
        },
      ],
    };
    expect(validateCommunicationAudienceSpec(valid)).toBeNull();

    const invalid: CommunicationAudienceSpec = {
      composition: "UNION",
      components: [{ structural: {} }],
    };
    expect(validateCommunicationAudienceSpec(invalid)).toMatch(/at least one selector/);
  });

  it("AND/OR set algebra and explicit include/exclude semantics", () => {
    expect(unionPersonIdSets([["a", "b"], ["b", "c"]]).sort()).toEqual(["a", "b", "c"]);
    expect(intersectPersonIdSets([["a", "b", "c"], ["b", "c", "d"]]).sort()).toEqual(["b", "c"]);
    expect(
      applyExplicitPersonIncludeExclude(["a"], {
        includePersonIds: ["b"],
        excludePersonIds: ["a"],
      }).sort(),
    ).toEqual(["b"]);
  });

  it("authorization intersects audience with sender scope (does not expand rights)", () => {
    const scope: SenderCommunicationScope = {
      tenantId: "t1",
      senderUserId: "u1",
      allowedSubjectPersonIds: new Set(["p1", "p2"]),
    };
    expect(intersectAudienceWithSenderScope(["p1", "p3", "p4"], scope)).toEqual(["p1"]);

    const { effectiveSubjectPersonIds } = resolveEffectiveRecipients(
      ["p1", "p2", "p9"],
      scope,
      (personId) => ({
        subjectPersonId: personId,
        category: "TEAM_OPERATIONAL",
        channel: "IN_APP",
        channelAllowedByPreference: personId !== "p2",
        safeguardingAllowsChannel: true,
      }),
    );
    expect(effectiveSubjectPersonIds).toEqual(["p1"]);
  });

  it("team default target provides structural team audience", () => {
    const audience = defaultTeamOperationalAudience("team-f2");
    expect(validateCommunicationAudienceSpec(audience)).toBeNull();
    expect(audience.components[0]?.structural?.teamIds).toEqual(["team-f2"]);
  });

  it("event presets map to participation filters without duplicating attendance", () => {
    expect(EVENT_PRESET_PARTICIPATION_FILTER.NOT_RESPONDED).toBe("PENDING");
    expect(EVENT_PRESET_PARTICIPATION_FILTER.ACCEPTED_ONLY).toBe("ACCEPTED");
  });
});
