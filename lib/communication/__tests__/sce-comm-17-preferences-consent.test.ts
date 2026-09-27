import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateCommunicationDeliveryPreference } from "@/lib/communication/preferences/evaluate-communication-delivery-preference";
import {
  listCommunicationPreferencesForUser,
  upsertUserCommunicationPreference,
  upsertSponsorContactCommunicationPreference,
} from "@/lib/communication/preferences/communication-preference-service";
import { resolveRecipientSnapshotEmailEligibility } from "@/lib/communication/platform-email/recipient-email-eligibility";
import { resolvePublicationCommunicationPreferenceCategory } from "@/lib/communication/preferences/publication-category";
import { isUserConfigurablePreference } from "@/lib/communication/preferences/preference-defaults";

const mocks = vi.hoisted(() => ({
  userCommunicationPreference: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  sponsorContactCommunicationPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  sponsorContact: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  person: { findFirst: vi.fn() },
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userCommunicationPreference: mocks.userCommunicationPreference,
    sponsorContactCommunicationPreference: mocks.sponsorContactCommunicationPreference,
    sponsorContact: mocks.sponsorContact,
    user: mocks.user,
    person: mocks.person,
  },
}));

vi.mock("@/lib/audit/log-action", () => ({
  logAction: (...args: unknown[]) => mocks.logAction(...args),
}));

describe("SCE-COMM-17 preferences & consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userCommunicationPreference.findMany.mockResolvedValue([]);
    mocks.sponsorContactCommunicationPreference.findMany.mockResolvedValue([]);
  });

  it("defaults CLUB_INFORMATION email to allowed", () => {
    const result = evaluateCommunicationDeliveryPreference({
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("DEFAULT_ALLOWED");
  });

  it("honours explicit disable per channel", () => {
    const result = evaluateCommunicationDeliveryPreference({
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
      explicitState: "DISABLED",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("EXPLICITLY_DISABLED");
  });

  it("keeps operational categories required", () => {
    const result = evaluateCommunicationDeliveryPreference({
      category: "CLUB_OPERATIONAL",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
      explicitState: "DISABLED",
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("REQUIRED_OPERATIONAL");
    expect(isUserConfigurablePreference({ category: "CLUB_OPERATIONAL", channel: "EMAIL" })).toBe(
      false,
    );
  });

  it("separates sponsor commercial email consent from club information", () => {
    const club = evaluateCommunicationDeliveryPreference({
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
    });
    const sponsor = evaluateCommunicationDeliveryPreference({
      category: "SPONSOR_COMMERCIAL",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
    });
    expect(club.allowed).toBe(true);
    expect(sponsor.allowed).toBe(false);
    expect(sponsor.reason).toBe("CONSENT_REQUIRED");
  });

  it("allows sponsor commercial email only with explicit enable", () => {
    const result = evaluateCommunicationDeliveryPreference({
      category: "SPONSOR_COMMERCIAL",
      channel: "EMAIL",
      identity: { kind: "SPONSOR_CONTACT", tenantId: "t1", sponsorContactId: "sc1" },
      explicitState: "ENABLED",
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("EXPLICITLY_ENABLED");
  });

  it("in-app preference is independent from email disable", () => {
    const email = evaluateCommunicationDeliveryPreference({
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
      explicitState: "DISABLED",
    });
    const inApp = evaluateCommunicationDeliveryPreference({
      category: "CLUB_INFORMATION",
      channel: "IN_APP",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
    });
    expect(email.allowed).toBe(false);
    expect(inApp.allowed).toBe(true);
  });

  it("team operational push remains allowed when club information email is disabled", () => {
    const clubEmail = evaluateCommunicationDeliveryPreference({
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
      explicitState: "DISABLED",
    });
    const teamPush = evaluateCommunicationDeliveryPreference({
      category: "TEAM_OPERATIONAL",
      channel: "PUSH",
      identity: { kind: "USER", tenantId: "t1", userId: "u1" },
    });
    expect(clubEmail.allowed).toBe(false);
    expect(teamPush.allowed).toBe(true);
  });

  it("infers sponsor commercial publication category from sponsor-only audience", () => {
    const category = resolvePublicationCommunicationPreferenceCategory({
      kind: "CAMPAIGN",
      audienceSpecJson: {
        composition: "UNION",
        components: [{ sponsor: { allActiveSponsors: true } }],
      },
    });
    expect(category).toBe("SPONSOR_COMMERCIAL");
  });

  it("blocks external sponsor email without consent at eligibility seam", async () => {
    mocks.sponsorContactCommunicationPreference.findMany.mockResolvedValue([]);
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "t1",
      emailChannelEnabled: true,
      category: "CLUB_INFORMATION",
      snapshot: {
        tenantId: "t1",
        recipientKind: "EXTERNAL_SPONSOR_CONTACT",
        subjectPersonId: null,
        sponsorContactId: "sc-1",
        deliveryUserId: null,
        externalSnapshotJson: {
          email: "ext@example.com",
          deliveryCapability: "EMAIL_DELIVERY_CANDIDATE",
        },
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.skipReason).toBe("CONSENT_REQUIRED");
  });

  it("allows internal email when preference allows", async () => {
    mocks.userCommunicationPreference.findMany.mockResolvedValue([]);
    mocks.user.findFirst.mockResolvedValue({ email: "user@example.com" });
    const result = await resolveRecipientSnapshotEmailEligibility({
      tenantId: "t1",
      emailChannelEnabled: true,
      category: "CLUB_INFORMATION",
      snapshot: {
        tenantId: "t1",
        recipientKind: "INTERNAL_IN_APP",
        subjectPersonId: "p1",
        deliveryUserId: "u1",
        externalSnapshotJson: null,
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.email).toBe("user@example.com");
  });

  it("records audit on preference upsert without secrets", async () => {
    mocks.userCommunicationPreference.findUnique.mockResolvedValue(null);
    mocks.userCommunicationPreference.upsert.mockResolvedValue({
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      explicitState: "DISABLED",
      source: "USER_SELF_SERVICE",
    });
    await upsertUserCommunicationPreference({
      tenantId: "t1",
      userId: "u1",
      actorUserId: "u1",
      category: "CLUB_INFORMATION",
      channel: "EMAIL",
      explicitState: "DISABLED",
    });
    expect(mocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "COMMUNICATION_PREFERENCE_CHANGED",
        afterJson: expect.not.objectContaining({ email: expect.anything() }),
      }),
    );
  });

  it("rejects configuring operational preferences via service", async () => {
    await expect(
      upsertUserCommunicationPreference({
        tenantId: "t1",
        userId: "u1",
        actorUserId: "u1",
        category: "CLUB_OPERATIONAL",
        channel: "EMAIL",
        explicitState: "DISABLED",
      }),
    ).rejects.toThrow(/not configurable/);
  });

  it("lists UX settings with required operational state", async () => {
    mocks.userCommunicationPreference.findMany.mockResolvedValue([]);
    const rows = await listCommunicationPreferencesForUser("t1", "u1");
    const operational = rows.find(
      (r) => r.category === "CLUB_OPERATIONAL" && r.channel === "EMAIL",
    );
    expect(operational?.effectiveState).toBe("REQUIRED");
    expect(operational?.userConfigurable).toBe(false);
  });

  it("supports admin sponsor contact commercial preference", async () => {
    mocks.sponsorContact.findFirst.mockResolvedValue({ id: "sc1" });
    mocks.sponsorContactCommunicationPreference.findUnique.mockResolvedValue(null);
    mocks.sponsorContactCommunicationPreference.upsert.mockResolvedValue({
      explicitState: "ENABLED",
      source: "ADMIN",
    });
    await upsertSponsorContactCommunicationPreference({
      tenantId: "t1",
      sponsorContactId: "sc1",
      actorUserId: "admin-1",
      channel: "EMAIL",
      explicitState: "ENABLED",
    });
    expect(mocks.sponsorContactCommunicationPreference.upsert).toHaveBeenCalled();
  });
});
