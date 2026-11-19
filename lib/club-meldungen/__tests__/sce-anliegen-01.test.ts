import { describe, expect, it } from "vitest";
import {
  canViewMeldungAsReporter,
  canViewMeldungInternal,
  canViewMeldung,
  canMutateMeldungInternal,
} from "@/lib/club-meldungen/access";
import { allocateClubMeldungCaseNumber } from "@/lib/club-meldungen/case-number";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  processClubMeldungInboundEmailFixture,
  verifyClubMeldungEmailReplay,
  resolveClubMeldungIdFromEmailThread,
} from "@/lib/club-meldungen/email-adapter";

describe("club meldungen access", () => {
  const meldung = { reporterUserId: "user-a", accountableUserId: "user-b" };

  it("reporter sees own case with meldungen.submit", () => {
    expect(
      canViewMeldungAsReporter(meldung, "user-a", [PERMISSIONS.MELDUNGEN_SUBMIT]),
    ).toBe(true);
    expect(
      canViewMeldungAsReporter(meldung, "user-c", [PERMISSIONS.MELDUNGEN_SUBMIT]),
    ).toBe(false);
  });

  it("view_all can mutate without assignment", () => {
    expect(
      canMutateMeldungInternal(meldung, {
        actorUserId: "user-x",
        permissionKeys: [PERMISSIONS.MELDUNGEN_VIEW_ALL],
      }),
    ).toBe(true);
  });

  it("handler with view_all sees without assignment", () => {
    expect(
      canViewMeldungInternal(meldung, {
        actorUserId: "user-x",
        permissionKeys: [PERMISSIONS.MELDUNGEN_VIEW_ALL],
      }),
    ).toBe(true);
  });

  it("handler with handle can triage unassigned without view_all", () => {
    const unassigned = { reporterUserId: "user-a", accountableUserId: null as string | null };
    expect(
      canViewMeldungInternal(unassigned, {
        actorUserId: "user-x",
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      }),
    ).toBe(true);
    expect(
      canMutateMeldungInternal(unassigned, {
        actorUserId: "user-x",
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      }),
    ).toBe(true);
  });

  it("handle without assignment cannot read another handler case", () => {
    expect(
      canViewMeldung(
        { reporterUserId: "user-a", accountableUserId: "user-b" },
        { actorUserId: "user-x", permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE] },
      ),
    ).toBe(false);
  });

  it("handler without handle/view_all needs assignment", () => {
    expect(
      canViewMeldungInternal(meldung, {
        actorUserId: "user-b",
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      }),
    ).toBe(true);
    expect(
      canViewMeldungInternal(meldung, {
        actorUserId: "user-c",
        permissionKeys: [PERMISSIONS.MELDUNGEN_HANDLE],
      }),
    ).toBe(false);
  });
});

describe("club meldungen email adapter (fixtures)", () => {
  const fixtures = {
    tenantKeyToId: { "fc-demo": "tenant-1" },
    senderUserByEmail: { "reporter@example.com": "user-a" },
    caseMessageIds: { "<msg-1@fixture>": "meldung-1" },
    caseMeta: {
      "meldung-1": { id: "meldung-1", caseNumber: "M-2026-00001", reporterUserId: "user-a" },
    },
  };

  it("threads inbound reply to existing case", () => {
    const nonce = `nonce-${Math.random()}`;
    const result = processClubMeldungInboundEmailFixture(
      {
        tenantKey: "fc-demo",
        mailboxToken: "fixture",
        messageId: "new@fixture",
        inReplyTo: "<msg-1@fixture>",
        fromEmail: "reporter@example.com",
        subject: "Re: Wasser",
        bodyText: "Update",
        receivedAt: new Date().toISOString(),
        replayNonce: nonce,
      },
      fixtures,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("appended_to_case");
      expect(result.meldungId).toBe("meldung-1");
    }
  });

  it("rejects replay", () => {
    const nonce = "fixed-nonce-replay-test";
    expect(verifyClubMeldungEmailReplay(nonce)).toBe(true);
    expect(verifyClubMeldungEmailReplay(nonce)).toBe(false);
    const result = processClubMeldungInboundEmailFixture(
      {
        tenantKey: "fc-demo",
        mailboxToken: "fixture",
        messageId: "x",
        inReplyTo: "<msg-1@fixture>",
        fromEmail: "reporter@example.com",
        subject: "Re",
        bodyText: "x",
        receivedAt: new Date().toISOString(),
        replayNonce: nonce,
      },
      fixtures,
    );
    expect(result).toEqual({ ok: false, reason: "replay" });
  });

  it("resolves thread headers", () => {
    expect(
      resolveClubMeldungIdFromEmailThread({
        references: ["<msg-1@fixture>"],
        syntheticCaseMessageIds: fixtures.caseMessageIds,
      }),
    ).toBe("meldung-1");
  });
});