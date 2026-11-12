import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    meetingAgendaItem: { findMany: vi.fn().mockResolvedValue([]) },
    meetingDecision: { findMany: vi.fn().mockResolvedValue([]) },
    task: { findMany: vi.fn().mockResolvedValue([]) },
    initiative: { updateMany: vi.fn() },
  },
}));

const ROOT = join(__dirname, "../../..");

function readSrc(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SCE-CD-03R2 UAT corrections", () => {
  it("initiative creation uses dedicated page route, not modal trigger", () => {
    const trigger = readSrc("components/admin/initiatives/CreateInitiativeTrigger.tsx");
    expect(trigger).toContain('href="/vereinsleitung/initiativen/new"');
    expect(trigger).not.toContain("CreateInitiativeComposerDialog");
  });

  it("InitiativeForm uses PeoplePicker and removes manual progress", () => {
    const form = readSrc("components/admin/initiatives/InitiativeForm.tsx");
    expect(form).toContain("PeoplePicker");
    expect(form).not.toContain("Fortschritt (0–100)");
  });

  it("decision PATCH preserves owner on partial sourceAgendaItemId update", () => {
    const route = readSrc("app/api/meetings/[id]/decisions/[decisionId]/route.ts");
    expect(route).toContain("body?.ownerPersonId !== undefined");
    expect(route).not.toMatch(/owner:\s*body\?\.owner\?\.trim\(\)\s*\|\|\s*null,/);
  });

  it("registers initiative progress and approval modules", () => {
    expect(readSrc("lib/club-development/initiative-progress.ts")).toContain(
      "computeInitiativeProgressSnapshot",
    );
    expect(readSrc("app/api/initiatives/[id]/approval/route.ts")).toContain(
      "recordInitiativeApprovalVote",
    );
  });

  it("contextual task create navigates to full workspace page", () => {
    const trigger = readSrc("components/admin/aufgaben/contextual/ContextualTaskCreateTrigger.tsx");
    expect(trigger).toContain("buildContextualTaskCreateHref");
    expect(trigger).toContain('href={createHref}');
  });

  it("schema adds initiative ownership, approval and process persistence", () => {
    const schema = readSrc("prisma/schema.prisma");
    expect(schema).toContain("ownerPersonId");
    expect(schema).toContain("InitiativeApprovalVote");
    expect(schema).toContain("ClubDevelopmentProcess");
  });

  it("computes zero progress without eligible tasks", async () => {
    const { computeInitiativeProgressSnapshot } = await import(
      "@/lib/club-development/initiative-progress"
    );
    const snap = await computeInitiativeProgressSnapshot("t1", "i1");
    expect(snap.progress).toBe(0);
    expect(snap.eligibleCount).toBe(0);
  });
});
