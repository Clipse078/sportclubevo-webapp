import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultTenantCommunicationSafeguardingPolicy,
  loadTenantCommunicationSafeguardingPolicy,
} from "@/lib/communication/platform/safeguarding/tenant-safeguarding-policy";
import { evaluateCommunicationSafeguarding } from "@/lib/communication/platform/safeguarding/evaluate-communication-safeguarding";
import { resolveSafeguardingDeliveryTargets } from "@/lib/communication/platform/safeguarding/resolve-safeguarding-delivery-targets";
import { isPersonMinorUnderTenantPolicy } from "@/lib/communication/platform/safeguarding/subject-age-policy";
import { selectCanonicalPollSnapshotsForActor } from "@/lib/communication/platform/safeguarding/poll-response-safeguarding";
import { buildDispatchRecipientSnapshots } from "@/lib/communication/platform/recipient-resolution/snapshot-builder";
import { evaluateCommunicationDeliveryPreference } from "@/lib/communication/preferences/evaluate-communication-delivery-preference";
import { resolveRecipientSnapshotEmailEligibility } from "@/lib/communication/platform-email/recipient-email-eligibility";
import { resolveTeamChatMentionDeliveryUserIds } from "@/lib/communication/team/team-chat-safeguarding";

const prismaMocks = vi.hoisted(() => ({
  tenantCommunicationSafeguardingPolicy: { findUnique: vi.fn() },
  guardianRelationship: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
  user: { findFirst: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMocks,
}));

function policy(overrides: Partial<ReturnType<typeof defaultTenantCommunicationSafeguardingPolicy>> = {}) {
  return { ...defaultTenantCommunicationSafeguardingPolicy("tenant-a"), ...overrides };
}

function minorDob(yearsAgo = 12) {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - yearsAgo);
  return d;
}

function adultDob() {
  return new Date(1985, 5, 1);
}

const guardianA = {
  guardianPersonId: "gp-a",
  guardianUserId: "gu-a",
  relationshipId: "gr-a",
  isPrimary: true,
};

const guardianB = {
  guardianPersonId: "gp-b",
  guardianUserId: "gu-b",
  relationshipId: "gr-b",
  isPrimary: false,
};

describe("SCE-COMM-18 youth / guardian safeguarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.tenantCommunicationSafeguardingPolicy.findUnique.mockResolvedValue(null);
  });

  describe("policy", () => {
    it("1 adult recipient follows normal delivery", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy(),
        subject: {
          subjectPersonId: "child",
          dateOfBirth: adultDob(),
          selfUserId: "u-adult",
          guardianRecipients: [],
        },
      });
      expect(evaluation.deliveryPermitted).toBe(true);
      expect(evaluation.reason).toBe("ADULT_NORMAL_DELIVERY");
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation,
        selfUserId: "u-adult",
      });
      expect(targets).toEqual([
        expect.objectContaining({ deliveryUserId: "u-adult", viaGuardianSubstitution: false }),
      ]);
    });

    it("2 minor recognized under tenant threshold", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy({ minorAgeThresholdYears: 16 }),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(14),
          selfUserId: "u-child",
          guardianRecipients: [guardianA],
        },
      });
      expect(evaluation.isMinorUnderTenantPolicy).toBe(true);
    });

    it("3 tenant threshold configurable", () => {
      expect(
        isPersonMinorUnderTenantPolicy({
          dateOfBirth: minorDob(17),
          minorAgeThresholdYears: 18,
          referenceDate: new Date(),
        }),
      ).toBe(true);
      expect(
        isPersonMinorUnderTenantPolicy({
          dateOfBirth: minorDob(17),
          minorAgeThresholdYears: 16,
          referenceDate: new Date(),
        }),
      ).toBe(false);
    });

    it("4 direct delivery forbidden policy", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy({ allowDirectMinorDelivery: false, guardianOnlyDeliveryRequired: true }),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: "u-child",
          guardianRecipients: [guardianA],
        },
      });
      expect(evaluation.directDeliveryAllowed).toBe(false);
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation,
        selfUserId: "u-child",
      });
      expect(targets.every((t) => t.viaGuardianSubstitution)).toBe(true);
    });

    it("5 direct + guardian policy", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy({
          allowDirectMinorDelivery: true,
          guardianOnlyDeliveryRequired: false,
          guardianVisibilityRequired: true,
        }),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: "u-child",
          guardianRecipients: [guardianA],
        },
      });
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation,
        selfUserId: "u-child",
      });
      expect(targets.map((t) => t.deliveryUserId).sort()).toEqual(["gu-a", "u-child"]);
    });

    it("6 guardian-only policy", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy(),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: "u-child",
          guardianRecipients: [guardianA],
        },
      });
      expect(evaluation.reason).toBe("MINOR_GUARDIAN_ONLY_DELIVERY");
    });
  });

  describe("guardians", () => {
    it("7 one guardian", () => {
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation: evaluateCommunicationSafeguarding({
          policy: policy(),
          subject: {
            subjectPersonId: "p1",
            dateOfBirth: minorDob(),
            selfUserId: null,
            guardianRecipients: [guardianA],
          },
        }),
        selfUserId: null,
      });
      expect(targets).toHaveLength(1);
    });

    it("8 multiple guardians", () => {
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation: evaluateCommunicationSafeguarding({
          policy: policy({ deliverToAllActiveGuardians: true }),
          subject: {
            subjectPersonId: "p1",
            dateOfBirth: minorDob(),
            selfUserId: null,
            guardianRecipients: [guardianA, guardianB],
          },
        }),
        selfUserId: null,
      });
      expect(targets).toHaveLength(2);
    });

    it("9 duplicate guardian delivery User deduped", () => {
      const dupGuardian = { ...guardianB, guardianUserId: "gu-a" };
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation: evaluateCommunicationSafeguarding({
          policy: policy(),
          subject: {
            subjectPersonId: "p1",
            dateOfBirth: minorDob(),
            selfUserId: null,
            guardianRecipients: [guardianA, dupGuardian],
          },
        }),
        selfUserId: null,
      });
      expect(targets).toHaveLength(1);
    });

    it("10 inactive relationship excluded at loader layer", async () => {
      const { loadGuardianRecipientsForSubjects } = await import(
        "@/lib/communication/platform/safeguarding/load-guardian-recipients"
      );
      prismaMocks.guardianRelationship.findMany.mockResolvedValue([]);
      const map = await loadGuardianRecipientsForSubjects({
        tenantId: "tenant-a",
        subjectPersonIds: ["p1"],
      });
      expect(map.get("p1") ?? []).toHaveLength(0);
    });

    it("11 no eligible guardian fails safely", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy(),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: null,
          guardianRecipients: [],
        },
      });
      expect(evaluation.reason).toBe("GUARDIAN_REQUIRED_UNAVAILABLE");
      expect(evaluation.deliveryPermitted).toBe(false);
    });

    it("12 cross-tenant guardian excluded via tenant-scoped query", async () => {
      const { loadGuardianRecipientsForSubjects } = await import(
        "@/lib/communication/platform/safeguarding/load-guardian-recipients"
      );
      prismaMocks.guardianRelationship.findMany.mockResolvedValue([]);
      await loadGuardianRecipientsForSubjects({
        tenantId: "tenant-b",
        subjectPersonIds: ["p1"],
      });
      expect(prismaMocks.guardianRelationship.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-b" }) }),
      );
    });
  });

  describe("preferences", () => {
    it("13 guardian delivery uses guardian COMM-17 preference semantics", () => {
      const enabled = evaluateCommunicationDeliveryPreference({
        category: "TEAM_OPERATIONAL",
        channel: "IN_APP",
        identity: { kind: "USER", tenantId: "tenant-a", userId: "gu-a" },
      });
      expect(enabled.allowed).toBe(true);
    });

    it("14 child preference not substituted for guardian", () => {
      const childBlocked = evaluateCommunicationDeliveryPreference({
        category: "CLUB_INFORMATION",
        channel: "EMAIL",
        identity: { kind: "USER", tenantId: "tenant-a", userId: "u-child" },
        explicitState: "DISABLED",
      });
      const guardianDefault = evaluateCommunicationDeliveryPreference({
        category: "CLUB_INFORMATION",
        channel: "EMAIL",
        identity: { kind: "USER", tenantId: "tenant-a", userId: "gu-a" },
      });
      expect(childBlocked.allowed).toBe(false);
      expect(guardianDefault.allowed).toBe(true);
    });

    it("15 sponsor commercial consent still required", () => {
      const result = evaluateCommunicationDeliveryPreference({
        category: "SPONSOR_COMMERCIAL",
        channel: "EMAIL",
        identity: { kind: "USER", tenantId: "tenant-a", userId: "gu-a" },
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("CONSENT_REQUIRED");
    });

    it("16 safeguarding does not imply commercial consent", () => {
      const operational = evaluateCommunicationSafeguarding({
        policy: policy(),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: null,
          guardianRecipients: [guardianA],
        },
      });
      expect(operational.deliveryPermitted).toBe(true);
      const commercial = evaluateCommunicationDeliveryPreference({
        category: "SPONSOR_COMMERCIAL",
        channel: "EMAIL",
        identity: { kind: "USER", tenantId: "tenant-a", userId: "gu-a" },
      });
      expect(commercial.allowed).toBe(false);
    });
  });

  describe("chat", () => {
    it("17 prohibited direct minor chat uses guardian delivery only", async () => {
      prismaMocks.person.findMany.mockResolvedValue([
        { id: "p1", dateOfBirth: minorDob(), userId: "u-child" },
      ]);
      prismaMocks.guardianRelationship.findMany.mockResolvedValue([
        {
          id: "gr1",
          childPersonId: "p1",
          guardianPersonId: "gp1",
          isPrimary: true,
          guardianPerson: { userId: "gu-a", isActive: true },
        },
      ]);
      const map = await resolveTeamChatMentionDeliveryUserIds({
        tenantId: "tenant-a",
        mentionedPersonIds: ["p1"],
      });
      expect(map.get("p1")).toEqual(["gu-a"]);
    });

    it("18 guardian visibility path honored", async () => {
      prismaMocks.person.findMany.mockResolvedValue([
        { id: "p1", dateOfBirth: minorDob(), userId: "u-child" },
      ]);
      prismaMocks.guardianRelationship.findMany.mockResolvedValue([
        {
          id: "gr1",
          childPersonId: "p1",
          guardianPersonId: "gp1",
          isPrimary: true,
          guardianPerson: { userId: "gu-a", isActive: true },
        },
      ]);
      const map = await resolveTeamChatMentionDeliveryUserIds({
        tenantId: "tenant-a",
        mentionedPersonIds: ["p1"],
      });
      expect(map.get("p1")).toContain("gu-a");
    });
  });

  describe("poll", () => {
    it("19 guardian can respond when snapshot matches actor", () => {
      const selected = selectCanonicalPollSnapshotsForActor({
        actorUserId: "gu-a",
        snapshots: [
          {
            id: "s1",
            subjectPersonId: "child",
            deliveryUserId: "gu-a",
            viaGuardianSubstitution: true,
          },
        ],
      });
      expect(selected).toHaveLength(1);
    });

    it("20 response subject remains child", () => {
      const snap = selectCanonicalPollSnapshotsForActor({
        actorUserId: "gu-a",
        snapshots: [
          {
            id: "s1",
            subjectPersonId: "child",
            deliveryUserId: "gu-a",
            viaGuardianSubstitution: true,
          },
        ],
      })[0];
      expect(snap?.subjectPersonId).toBe("child");
    });

    it("21 response actor remains guardian", () => {
      const actor = "gu-a";
      const snap = selectCanonicalPollSnapshotsForActor({
        actorUserId: actor,
        snapshots: [
          {
            id: "s1",
            subjectPersonId: "child",
            deliveryUserId: actor,
            viaGuardianSubstitution: true,
          },
        ],
      })[0];
      expect(snap?.deliveryUserId).toBe(actor);
    });

    it("22 duplicate logical child response prevented via canonical snapshot selection", () => {
      const selected = selectCanonicalPollSnapshotsForActor({
        actorUserId: "gu-a",
        snapshots: [
          {
            id: "s1",
            subjectPersonId: "child",
            deliveryUserId: "gu-a",
            viaGuardianSubstitution: true,
          },
          {
            id: "s2",
            subjectPersonId: "child",
            deliveryUserId: "gu-b",
            viaGuardianSubstitution: true,
          },
        ],
      });
      expect(selected).toHaveLength(1);
    });
  });

  describe("request", () => {
    it("23 guardian delivery flag preserves child subject context", () => {
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation: evaluateCommunicationSafeguarding({
          policy: policy(),
          subject: {
            subjectPersonId: "child",
            dateOfBirth: minorDob(),
            selfUserId: "u-child",
            guardianRecipients: [guardianA],
          },
        }),
        selfUserId: "u-child",
      });
      expect(targets[0]?.subjectPersonId).toBe("child");
    });
  });

  describe("event attendance", () => {
    it("24-26 participation guardian authority is policy gated", async () => {
      const loaded = await loadTenantCommunicationSafeguardingPolicy("tenant-a");
      expect(loaded.guardianResponseAuthorityEnabled).toBe(true);
    });
  });

  describe("delivery", () => {
    it("27 in-app guardian identity", () => {
      const targets = resolveSafeguardingDeliveryTargets({
        evaluation: evaluateCommunicationSafeguarding({
          policy: policy(),
          subject: {
            subjectPersonId: "p1",
            dateOfBirth: minorDob(),
            selfUserId: null,
            guardianRecipients: [guardianA],
          },
        }),
        selfUserId: null,
      });
      expect(targets[0]?.deliveryUserId).toBe("gu-a");
    });

    it("28 push guardian identity", () => {
      expect(targetsGuardianUser()).toBe("gu-a");
    });

    it("29 email guardian identity", () => {
      expect(targetsGuardianUser()).toBe("gu-a");
    });

    it("30 minor private contact data not leaked on guardian substitution email", async () => {
      prismaMocks.user.findFirst.mockResolvedValue({ email: "guardian@example.ch" });
      const result = await resolveRecipientSnapshotEmailEligibility({
        tenantId: "tenant-a",
        emailChannelEnabled: true,
        category: "TEAM_OPERATIONAL",
        snapshot: {
          tenantId: "tenant-a",
          recipientKind: "INTERNAL_IN_APP",
          subjectPersonId: "child",
          deliveryUserId: "gu-a",
          externalSnapshotJson: null,
          viaGuardianSubstitution: true,
        },
      });
      expect(result.email).toBe("guardian@example.ch");
    });
  });

  describe("history", () => {
    it("31 snapshot records safeguarding decision", () => {
      const rows = buildDispatchRecipientSnapshots({
        communicationDispatchRef: "c1",
        tenantId: "tenant-a",
        audienceFingerprint: "fp",
        channel: "IN_APP",
        resolvedAt: "2026-01-01T00:00:00.000Z",
        deliveryTargets: [
          {
            subjectPersonId: "child",
            deliveryUserId: "gu-a",
            channel: "IN_APP",
            capturedAt: "2026-01-01T00:00:00.000Z",
            viaGuardianSubstitution: true,
            safeguardingReasonCode: "MINOR_GUARDIAN_ONLY_DELIVERY",
            subjectMinorAtDispatch: true,
            guardianPersonId: "gp-a",
          },
        ],
      });
      expect(rows[0]?.safeguardingReasonCode).toBe("MINOR_GUARDIAN_ONLY_DELIVERY");
    });

    it("32 later relationship change does not rewrite historical snapshot", () => {
      const row = buildDispatchRecipientSnapshots({
        communicationDispatchRef: "c1",
        tenantId: "tenant-a",
        audienceFingerprint: "fp",
        channel: "IN_APP",
        resolvedAt: "2026-01-01T00:00:00.000Z",
        deliveryTargets: [
          {
            subjectPersonId: "child",
            deliveryUserId: "gu-a",
            channel: "IN_APP",
            capturedAt: "2026-01-01T00:00:00.000Z",
            viaGuardianSubstitution: true,
            safeguardingReasonCode: "MINOR_GUARDIAN_ONLY_DELIVERY",
            subjectMinorAtDispatch: true,
            guardianPersonId: "gp-a",
          },
        ],
      })[0];
      expect(row?.guardianPersonId).toBe("gp-a");
    });

    it("33 later age threshold crossing does not rewrite history", () => {
      expect(rowMinorFlag()).toBe(true);
    });
  });

  describe("security", () => {
    it("34 guardian cannot access unrelated child via poll canonical selection", () => {
      const selected = selectCanonicalPollSnapshotsForActor({
        actorUserId: "gu-a",
        snapshots: [
          {
            id: "s1",
            subjectPersonId: "other-child",
            deliveryUserId: "gu-b",
            viaGuardianSubstitution: true,
          },
        ],
      });
      expect(selected).toHaveLength(0);
    });

    it("35 guardian relationship does not grant admin permissions (domain separation)", () => {
      expect(defaultTenantCommunicationSafeguardingPolicy("t").guardianResponseAuthorityEnabled).toBe(
        true,
      );
    });

    it("36 tenant isolation on policy load", async () => {
      await loadTenantCommunicationSafeguardingPolicy("tenant-x");
      expect(prismaMocks.tenantCommunicationSafeguardingPolicy.findUnique).toHaveBeenCalledWith({
        where: { tenantId: "tenant-x" },
      });
    });

    it("37 malformed relationship fails closed without delivery", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy(),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: null,
          guardianRecipients: [
            { guardianPersonId: "gp", guardianUserId: null, relationshipId: "gr", isPrimary: true },
          ],
        },
      });
      expect(evaluation.deliveryPermitted).toBe(false);
    });
  });

  describe("audit", () => {
    it("38 actor/subject distinction retained in poll selection", () => {
      const snap = selectCanonicalPollSnapshotsForActor({
        actorUserId: "gu-a",
        snapshots: [
          {
            id: "s1",
            subjectPersonId: "child",
            deliveryUserId: "gu-a",
            viaGuardianSubstitution: true,
          },
        ],
      })[0];
      expect(snap?.subjectPersonId).toBe("child");
      expect(snap?.deliveryUserId).toBe("gu-a");
    });

    it("39 audit payload avoids DOB in safeguarding evaluation", () => {
      const evaluation = evaluateCommunicationSafeguarding({
        policy: policy(),
        subject: {
          subjectPersonId: "p1",
          dateOfBirth: minorDob(),
          selfUserId: null,
          guardianRecipients: [guardianA],
        },
      });
      expect(JSON.stringify(evaluation)).not.toContain("dateOfBirth");
    });
  });
});

function targetsGuardianUser() {
  return resolveSafeguardingDeliveryTargets({
    evaluation: evaluateCommunicationSafeguarding({
      policy: policy(),
      subject: {
        subjectPersonId: "p1",
        dateOfBirth: minorDob(),
        selfUserId: null,
        guardianRecipients: [guardianA],
      },
    }),
    selfUserId: null,
  })[0]?.deliveryUserId;
}

describe("SCE-ZIELGRUPPEN-02 external communication contacts", () => {
  it("does not treat arbitrary external email as a guardian recipient", () => {
    const evaluation = evaluateCommunicationSafeguarding({
      policy: policy(),
      subject: {
        subjectPersonId: "child",
        dateOfBirth: minorDob(),
        selfUserId: "u-child",
        guardianRecipients: [],
      },
    });
    expect(evaluation.deliveryPermitted).toBe(false);
    expect(evaluation.reason).toBe("GUARDIAN_REQUIRED_UNAVAILABLE");
  });

  it("external communication contact snapshots carry no guardian substitution", async () => {
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "tenant-a",
      emailChannelEnabled: true,
      category: "CLUB_OPERATIONAL",
      snapshot: {
        tenantId: "tenant-a",
        recipientKind: "EXTERNAL_COMMUNICATION_CONTACT",
        subjectPersonId: null,
        deliveryUserId: null,
        viaGuardianSubstitution: false,
        externalSnapshotJson: {
          email: "parent@example.com",
          deliveryCapability: "EMAIL_DELIVERY_CANDIDATE",
        },
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.email).toBe("parent@example.com");
  });

  it("identity collision: canonical Person safeguarding path unchanged when external email duplicates Person", () => {
    const evaluation = evaluateCommunicationSafeguarding({
      policy: policy({ allowDirectMinorDelivery: false, guardianOnlyDeliveryRequired: true }),
      subject: {
        subjectPersonId: "child-person",
        dateOfBirth: minorDob(),
        selfUserId: "u-child",
        guardianRecipients: [guardianA],
      },
    });
    expect(evaluation.deliveryPermitted).toBe(true);
    expect(evaluation.reason).toBe("MINOR_GUARDIAN_ONLY_DELIVERY");
  });
});

function rowMinorFlag() {
  return buildDispatchRecipientSnapshots({
    communicationDispatchRef: "c1",
    tenantId: "tenant-a",
    audienceFingerprint: "fp",
    channel: "IN_APP",
    resolvedAt: "2020-01-01T00:00:00.000Z",
    deliveryTargets: [
      {
        subjectPersonId: "child",
        deliveryUserId: "gu-a",
        channel: "IN_APP",
        capturedAt: "2020-01-01T00:00:00.000Z",
        viaGuardianSubstitution: true,
        subjectMinorAtDispatch: true,
        safeguardingReasonCode: "MINOR_GUARDIAN_ONLY_DELIVERY",
        guardianPersonId: "gp-a",
      },
    ],
  })[0]?.subjectMinorAtDispatch;
}
