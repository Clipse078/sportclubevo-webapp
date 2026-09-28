import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  audienceSpecFromAllActiveSponsors,
  audienceSpecFromSponsorContactIds,
  audienceSpecFromSponsorOrganisationIds,
  sponsorCampaignAudiencePreselect,
} from "@/lib/communication/sponsor/sponsor-audience-spec";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import { resolveSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-resolution";
import { assertTenantOwnedSponsorAudienceSelectors } from "@/lib/sponsoring/sponsor-audience-ownership";
import { resolveSponsorAudienceAuthorization } from "@/lib/sponsoring/sponsor-authorization";
import { CAMPAIGN_BOUNDARY_FLAGS } from "@/lib/communication/campaign/campaign-boundaries";
import { EXTERNAL_EMAIL_DELIVERY_CANDIDATE } from "@/lib/communication/platform-email/delivery-capability";
import { summarizeClubAudienceSpec } from "@/lib/communication/club/club-audience-summary";
import { unionPersonIdSets } from "@/lib/communication/platform/audience/zielgruppe-validation";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { publishCampaign } from "@/lib/communication/campaign/campaign-service";
import { collectSponsorExternalSnapshotRows } from "@/lib/communication/sponsor/sponsor-external-recipient-snapshots";

const mocks = vi.hoisted(() => ({
  sponsorOrganisation: { findMany: vi.fn(), count: vi.fn() },
  sponsorContact: { findMany: vi.fn(), count: vi.fn() },
  sponsorCategory: { count: vi.fn() },
  person: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  platformCommunication: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: { createMany: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(),
  getEffectivePermissions: vi.fn(),
  resolveCommunicationRecipientsForDispatch: vi.fn(),
  emitCampaignPublishedNotifications: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    sponsorOrganisation: mocks.sponsorOrganisation,
    sponsorContact: mocks.sponsorContact,
    sponsorCategory: mocks.sponsorCategory,
    person: mocks.person,
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    $transaction: mocks.$transaction,
    userRole: { count: vi.fn() },
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    getEffectivePermissions: mocks.getEffectivePermissions,
    hasPermission: vi.fn(),
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: vi.fn(async () => false),
  isTenantClubAdmin: vi.fn(async () => false),
  resolvePersonIdForUser: vi.fn(async () => "person-sender"),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipientsForDispatch: (...args: unknown[]) =>
    mocks.resolveCommunicationRecipientsForDispatch(...args),
}));

vi.mock("@/lib/communication/campaign/campaign-notification-producer", () => ({
  emitCampaignPublishedNotifications: (...args: unknown[]) =>
    mocks.emitCampaignPublishedNotifications(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

vi.mock("@/lib/communication/platform-email/email-readiness-service", () => ({
  evaluatePlatformEmailReadiness: vi.fn(async () => ({
    ready: true,
    senderConfigured: true,
    transportConfigured: true,
    fromAddressValid: true,
    activeSource: "PLATFORM",
    providerStatus: "VERIFIED",
    platformFallbackActive: true,
    reasons: [],
  })),
}));

vi.mock("@/lib/communication/platform-email/platform-email-dispatch-service", () => ({
  enqueuePlatformCommunicationEmailDeliveries: vi.fn(async () => ({
    examined: 0,
    queued: 0,
    skipped: 0,
  })),
}));

vi.mock("@/lib/communication/sender-identity/prepare-email-sender-for-publish", () => ({
  prepareEmailSenderForPublish: vi.fn(async () => ({
    emailTransportReady: true,
    snapshotData: {
      emailSenderDisplayNameSnapshot: "Club",
      emailSenderAddressSnapshot: "club@example.com",
    },
  })),
}));

describe("SCE-COMM-13 sponsor audience integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEffectivePermissions.mockResolvedValue({ platform: [], tenant: [] });
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        platformCommunication: {
          updateMany: mocks.platformCommunication.updateMany,
          findFirst: mocks.platformCommunication.findFirst,
        },
        platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
      }),
    );
    mocks.platformCommunication.updateMany.mockResolvedValue({ count: 1 });
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("validates sponsor audience components in CommunicationAudienceSpec", () => {
    expect(validateCommunicationAudienceSpec(audienceSpecFromAllActiveSponsors())).toBeNull();
    expect(validateCommunicationAudienceSpec(audienceSpecFromSponsorOrganisationIds(["org-1"]))).toBeNull();
    expect(validateCommunicationAudienceSpec(audienceSpecFromSponsorContactIds(["c-1"]))).toBeNull();
    expect(
      validateCommunicationAudienceSpec({
        composition: "UNION",
        components: [{ sponsor: { sponsorOrganisationIds: Array.from({ length: 501 }, (_, i) => `id-${i}`) } }],
      }),
    ).not.toBeNull();
  });

  it("summarizes sponsor audience labels in German", () => {
    const summary = summarizeClubAudienceSpec(audienceSpecFromAllActiveSponsors());
    expect(summary).toContain("Alle aktiven Sponsoren");
  });

  it("resolves all active sponsors to active contacts only", async () => {
    mocks.sponsorOrganisation.findMany.mockResolvedValueOnce([{ id: "org-a" }, { id: "org-inactive" }]);
    mocks.sponsorOrganisation.findMany.mockResolvedValueOnce([
      {
        id: "org-a",
        name: "Müller AG",
        contacts: [
          {
            id: "c-1",
            tenantId: "tenant-a",
            sponsorOrganisationId: "org-a",
            personId: "p-1",
            firstName: "Peter",
            lastName: "Müller",
            email: "p@example.com",
            isActive: true,
          },
        ],
      },
    ]);

    const result = await resolveSponsorAudienceSelectors({
      tenantId: "tenant-a",
      selectors: { allActiveSponsors: true },
    });

    expect(result.contacts).toHaveLength(1);
    expect(result.linkedPersonIds).toEqual(["p-1"]);
    expect(result.externalContactIds).toEqual([]);
  });

  it("deduplicates overlapping sponsor organisation and explicit contact selectors", async () => {
    mocks.sponsorOrganisation.findMany.mockResolvedValueOnce([
      {
        id: "org-a",
        name: "Müller AG",
        contacts: [
          {
            id: "c-1",
            tenantId: "tenant-a",
            sponsorOrganisationId: "org-a",
            personId: "p-1",
            firstName: "Peter",
            lastName: "Müller",
            email: null,
            isActive: true,
          },
        ],
      },
    ]);
    mocks.sponsorContact.findMany.mockResolvedValueOnce([
      {
        id: "c-1",
        tenantId: "tenant-a",
        sponsorOrganisationId: "org-a",
        personId: "p-1",
        firstName: "Peter",
        lastName: "Müller",
        email: null,
        isActive: true,
        sponsorOrganisation: { name: "Müller AG" },
      },
    ]);

    const result = await resolveSponsorAudienceSelectors({
      tenantId: "tenant-a",
      selectors: {
        sponsorOrganisationIds: ["org-a"],
        sponsorContactIds: ["c-1"],
      },
    });
    expect(result.contacts).toHaveLength(1);
    expect(unionPersonIdSets([result.linkedPersonIds, result.linkedPersonIds])).toEqual(["p-1"]);
  });

  it("supports external sponsor contacts without Person linkage", async () => {
    mocks.sponsorContact.findMany.mockResolvedValueOnce([
      {
        id: "c-ext",
        tenantId: "tenant-a",
        sponsorOrganisationId: "org-a",
        personId: null,
        firstName: "Erika",
        lastName: "Extern",
        email: "erika@firma.example",
        isActive: true,
        sponsorOrganisation: { name: "Müller AG" },
      },
    ]);

    const result = await resolveSponsorAudienceSelectors({
      tenantId: "tenant-a",
      selectors: { sponsorContactIds: ["c-ext"] },
    });
    expect(result.externalContactIds).toEqual(["c-ext"]);
    expect(result.linkedPersonIds).toEqual([]);
  });

  it("rejects cross-tenant sponsor organisation ids (fail closed)", async () => {
    mocks.sponsorOrganisation.count.mockResolvedValueOnce(0);
    await expect(
      assertTenantOwnedSponsorAudienceSelectors({
        tenantId: "tenant-a",
        selectors: { sponsorOrganisationIds: ["foreign-org"] },
      }),
    ).rejects.toThrow(/sponsor organisation not found/);
  });

  it("rejects cross-tenant sponsor contact ids (fail closed)", async () => {
    mocks.sponsorContact.count.mockResolvedValueOnce(0);
    await expect(
      assertTenantOwnedSponsorAudienceSelectors({
        tenantId: "tenant-a",
        selectors: { sponsorContactIds: ["foreign-contact"] },
      }),
    ).rejects.toThrow(/sponsor contact not found/);
  });

  it("keeps sponsor read authorization separate from communication send", async () => {
    mocks.getEffectivePermissions.mockResolvedValueOnce({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_CLUB_SEND],
    });
    const sendOnly = await resolveSponsorAudienceAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fc-a",
      userId: "user-1",
    });
    expect(sendOnly.canSelectSponsorAudience).toBe(false);

    mocks.getEffectivePermissions.mockResolvedValueOnce({
      platform: [],
      tenant: [PERMISSIONS.SPONSORING_VIEW, PERMISSIONS.COMMUNICATION_CLUB_SEND],
    });
    const both = await resolveSponsorAudienceAuthorization({
      tenantId: "tenant-a",
      tenantKey: "fc-a",
      userId: "user-1",
    });
    expect(both.canSelectSponsorAudience).toBe(true);
  });

  it("builds sponsor campaign composer preselection (Flow A seam)", () => {
    const spec = sponsorCampaignAudiencePreselect({
      sponsorOrganisationId: "org-a",
      sponsorContactIds: ["c-1"],
    });
    expect(spec.components[0]?.sponsor?.sponsorOrganisationIds).toEqual(["org-a"]);
    expect(spec.components[0]?.sponsor?.sponsorContactIds).toEqual(["c-1"]);
  });

  it("creates external snapshot rows without fake in-app delivery", async () => {
    mocks.sponsorContact.findMany.mockResolvedValueOnce([
      {
        id: "c-ext",
        tenantId: "tenant-a",
        sponsorOrganisationId: "org-a",
        personId: null,
        firstName: "Erika",
        lastName: "Extern",
        email: "erika@firma.example",
        isActive: true,
        sponsorOrganisation: { name: "Müller AG" },
      },
    ]);

    const rows = await collectSponsorExternalSnapshotRows({
      tenantId: "tenant-a",
      audience: audienceSpecFromSponsorContactIds(["c-ext"]),
      audienceFingerprint: "fp",
      channel: "IN_APP",
      resolvedAt: new Date().toISOString(),
      emailChannelEnabled: true,
      emailTransportReady: true,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.recipientKind).toBe("EXTERNAL_SPONSOR_CONTACT");
    expect(rows[0]?.deliveryUserId).toBeNull();
    expect(rows[0]?.externalSnapshotJson.deliveryCapability).toBe(
      EXTERNAL_EMAIL_DELIVERY_CANDIDATE,
    );
  });

  it("publish includes external sponsor snapshots and notifies internal users only", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "camp-1",
      tenantId: "tenant-a",
      status: "READY",
      kind: "CAMPAIGN",
      bodyText: "Body",
      subject: "Subject",
      internalName: "Internal",
      contextRef: { kind: "ORGANISATION", tenantId: "tenant-a" },
      audienceSpecJson: audienceSpecFromSponsorContactIds(["c-ext"]),
      conversation: { contextKind: "ORGANISATION", teamId: null },
      orchestrationMetaJson: null,
    });

    mocks.resolveCommunicationRecipientsForDispatch.mockResolvedValue({
      core: {
        metadata: {
          audienceFingerprint: "fp-sponsor",
          resolvedAt: "2026-09-27T10:00:00.000Z",
        },
        effectiveRecipientPersonIds: [],
      },
      pipeline: { deliveryTargets: [] },
      communicationDispatchRef: "camp-1",
    });

    mocks.sponsorContact.count.mockResolvedValue(1);
    mocks.sponsorContact.findMany.mockResolvedValue([
      {
        id: "c-ext",
        tenantId: "tenant-a",
        sponsorOrganisationId: "org-a",
        personId: null,
        firstName: "Erika",
        lastName: "Extern",
        email: "erika@firma.example",
        isActive: true,
        sponsorOrganisation: { name: "Müller AG" },
      },
    ]);

    const result = await publishCampaign({
      tenantId: "tenant-a",
      campaignId: "camp-1",
      senderUserId: "user-club",
    });

    expect(result.recipientCount).toBe(1);
    expect(mocks.platformCommunicationRecipientSnapshot.createMany).toHaveBeenCalledTimes(1);
    expect(mocks.emitCampaignPublishedNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deliveryUserIds: [] }),
    );
  });

  it("exposes COMM-14 outbound email boundary flag", () => {
    expect(CAMPAIGN_BOUNDARY_FLAGS.outboundEmail).toBe("EMAIL_IMPLEMENTED");
    expect(CAMPAIGN_BOUNDARY_FLAGS.sponsor).toBe("SPONSOR_AUDIENCE_INTEGRATED");
  });
});
