import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  composeMessageBodyWithPersonalSignature,
  previewMessageWithPersonalSignature,
} from "@/lib/communication/personal-signature/personal-signature-compose";
import {
  applyPersonalSignatureToOutboundBody,
  loadPersonalSignaturePreference,
  resetPersonalSignaturePreference,
  resolveIncludePersonalSignature,
  sanitizePersonalSignatureBody,
  savePersonalSignaturePreference,
  personalSignatureSupportedForMitteilungKind,
} from "@/lib/communication/personal-signature/personal-signature-service";
import { MAX_PERSONAL_SIGNATURE_LENGTH } from "@/lib/communication/personal-signature/personal-signature-constants";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";

const prismaMock = vi.hoisted(() => ({
  userCommunicationPersonalSignature: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("SCE-COMM-UX-08A personal signatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("composes message and signature with blank line separator", () => {
    expect(
      composeMessageBodyWithPersonalSignature("Hallo Team", "Freundliche Grüsse\nMax"),
    ).toBe("Hallo Team\n\nFreundliche Grüsse\nMax");
  });

  it("preview separates message and signature for UI", () => {
    const preview = previewMessageWithPersonalSignature("Hi", "Sig");
    expect(preview.combined).toBe("Hi\n\nSig");
    expect(preview.signature).toBe("Sig");
  });

  it("sanitizes unsafe markup in stored signature", () => {
    expect(sanitizePersonalSignatureBody("<b>Hi</b>")).toBe("Hi");
  });

  it("rejects signatures over max length", () => {
    expect(() => sanitizePersonalSignatureBody("x".repeat(MAX_PERSONAL_SIGNATURE_LENGTH + 1))).toThrow(
      "SIGNATURE_TOO_LONG",
    );
  });

  it("resolveIncludePersonalSignature respects explicit false and default", () => {
    const pref = { bodyText: "Sig", useByDefault: true, hasStoredPreference: true };
    expect(resolveIncludePersonalSignature(undefined, pref)).toBe(true);
    expect(resolveIncludePersonalSignature(false, pref)).toBe(false);
    expect(resolveIncludePersonalSignature(true, pref)).toBe(true);
    expect(
      resolveIncludePersonalSignature(undefined, { ...pref, useByDefault: false }),
    ).toBe(false);
  });

  it("loads own signature preference for tenant user", async () => {
    prismaMock.userCommunicationPersonalSignature.findUnique.mockResolvedValue({
      bodyText: "Mine",
      useByDefault: true,
    });
    const pref = await loadPersonalSignaturePreference("t1", "u1");
    expect(pref.bodyText).toBe("Mine");
    expect(prismaMock.userCommunicationPersonalSignature.findUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: "t1", userId: "u1" } },
      select: { bodyText: true, useByDefault: true },
    });
  });

  it("save upserts only for acting user context", async () => {
    prismaMock.userCommunicationPersonalSignature.findUnique.mockResolvedValue(null);
    prismaMock.userCommunicationPersonalSignature.upsert.mockResolvedValue({
      bodyText: "Saved",
      useByDefault: false,
    });
    const result = await savePersonalSignaturePreference("t1", "u1", {
      bodyText: "Saved",
      useByDefault: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preference.bodyText).toBe("Saved");
      expect(result.preference.useByDefault).toBe(false);
    }
  });

  it("reset removes stored preference", async () => {
    prismaMock.userCommunicationPersonalSignature.deleteMany.mockResolvedValue({ count: 1 });
    const pref = await resetPersonalSignaturePreference("t1", "u1");
    expect(pref.hasStoredPreference).toBe(false);
    expect(pref.bodyText).toBeNull();
  });

  it("applyPersonalSignatureToOutboundBody embeds signature at send time", async () => {
    prismaMock.userCommunicationPersonalSignature.findUnique.mockResolvedValue({
      bodyText: "Footer",
      useByDefault: true,
    });
    const body = await applyPersonalSignatureToOutboundBody({
      tenantId: "t1",
      userId: "u1",
      messageBody: "Hello",
      includePersonalSignature: true,
    });
    expect(body).toBe("Hello\n\nFooter");
  });

  it("later signature edits do not change already composed outbound body input", async () => {
    prismaMock.userCommunicationPersonalSignature.findUnique.mockResolvedValueOnce({
      bodyText: "Old",
      useByDefault: true,
    });
    const frozen = await applyPersonalSignatureToOutboundBody({
      tenantId: "t1",
      userId: "u1",
      messageBody: "Msg",
      includePersonalSignature: true,
    });
    prismaMock.userCommunicationPersonalSignature.findUnique.mockResolvedValueOnce({
      bodyText: "New",
      useByDefault: true,
    });
    expect(frozen).toBe("Msg\n\nOld");
  });

  it("enforces combined body length server-side", async () => {
    prismaMock.userCommunicationPersonalSignature.findUnique.mockResolvedValue({
      bodyText: "x".repeat(100),
      useByDefault: true,
    });
    await expect(
      applyPersonalSignatureToOutboundBody({
        tenantId: "t1",
        userId: "u1",
        messageBody: "y".repeat(MAX_TEAM_COMMUNICATION_BODY_LENGTH),
        includePersonalSignature: true,
      }),
    ).rejects.toThrow("BODY_WITH_SIGNATURE_TOO_LONG");
  });

  it("mitteilung personal signature only for MESSAGE kind", () => {
    expect(personalSignatureSupportedForMitteilungKind("MESSAGE")).toBe(true);
    expect(personalSignatureSupportedForMitteilungKind("ANNOUNCEMENT")).toBe(false);
    expect(personalSignatureSupportedForMitteilungKind("ALERT")).toBe(false);
  });
});
