import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { searchInitiativeCandidates } from "../initiative-candidates";
import { linkInitiativeTarget, listTargetInitiativeLinks } from "../initiative-target-links";
import type { ActorContext } from "@/lib/visibility/actor-context";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const prismaMocks = vi.hoisted(() => ({
  initiativeFindMany: vi.fn(),
  initiativeFindFirst: vi.fn(),
  targetFindFirst: vi.fn(),
  initiativeTargetLinkUpsert: vi.fn(),
  initiativeTargetLinkFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    initiative: {
      findMany: prismaMocks.initiativeFindMany,
      findFirst: prismaMocks.initiativeFindFirst,
    },
    target: { findFirst: prismaMocks.targetFindFirst },
    initiativeTargetLink: {
      upsert: prismaMocks.initiativeTargetLinkUpsert,
      findMany: prismaMocks.initiativeTargetLinkFindMany,
    },
  },
}));

vi.mock("@/lib/visibility/visibility-filter", () => ({
  buildVisibilityWhere: vi.fn(() => ({})),
  applyVisibilityFilter: vi.fn((rows: unknown[]) => rows),
}));

function actorWith(perms: string[]): ActorContext {
  return {
    userId: "user-1",
    tenantId: "tenant-1",
    permissionKeys: perms,
    orgUnitIds: [],
    roleKeys: [],
    teamIds: [],
    personId: null,
  } as ActorContext;
}

describe("PKG-05 contextual creation (Ziel ↔ Vorhaben, Strategie ↔ Ziel)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes Vorhaben contextual actions on Ziel detail and edit", () => {
    const detail = read("app/(admin)/vereinsleitung/targets/[id]/page.tsx");
    const edit = read("app/(admin)/vereinsleitung/targets/[id]/edit/page.tsx");
    const section = read("components/admin/targets/TargetInitiativeLinksSection.tsx");
    expect(detail).toContain("TargetInitiativeLinksSection");
    expect(edit).toContain("TargetInitiativeLinksSection");
    const card = read("components/admin/initiatives/CreateInitiativeContextualCollapsibleCard.tsx");
    expect(card).toContain("CD_TARGET_COPY.createInitiativeAndLink");
    expect(card).toContain('collapseToggleTestId="target-create-initiative-and-link"');
    expect(section).toContain("CD_TARGET_COPY.linkExistingInitiative");
    expect(section).toContain("CreateInitiativeContextualCollapsibleCard");
    expect(section).not.toContain("CreateInitiativeComposerDialog");
    expect(section).not.toContain("<form");
  });

  it("reuses Vorhaben composer with preselected Ziel and contextual link callback", () => {
    const card = read("components/admin/initiatives/CreateInitiativeContextualCollapsibleCard.tsx");
    expect(card).toContain("preselectedTarget");
    expect(card).toContain("contextualLink");
    expect(card).toContain("/initiative-links");
    expect(card).toContain("InitiativeForm");
    expect(card).toContain('layout="composer"');
  });

  it("reuses Ziel composer for Strategie Schwerpunkte without navigation", () => {
    const strategy = read("components/admin/club-development/StrategyAuthoringPanel.tsx");
    const card = read("components/admin/targets/CreateTargetContextualCollapsibleCard.tsx");
    expect(strategy).toContain("CreateTargetContextualCollapsibleCard");
    expect(card).toContain('collapseToggleTestId="strategy-create-target-and-link"');
    expect(card).toContain("contextualFocus");
    expect(card).toContain("focus-targets");
    expect(card).toContain("linkAsSchwerpunkt");
  });

  it("searchInitiativeCandidates returns empty without view permission", async () => {
    const rows = await searchInitiativeCandidates(actorWith([]), "test", 10);
    expect(rows).toEqual([]);
    expect(prismaMocks.initiativeFindMany).not.toHaveBeenCalled();
  });

  it("listTargetInitiativeLinks reads canonical junction rows", async () => {
    prismaMocks.targetFindFirst.mockResolvedValue({ id: "target-1" });
    prismaMocks.initiativeTargetLinkFindMany.mockResolvedValue([
      {
        id: "link-1",
        initiative: { id: "init-1", slug: "vorhaben-a", title: "Vorhaben A", status: "PLANNED" },
      },
    ]);

    const rows = await listTargetInitiativeLinks("tenant-1", "target-1");
    expect(rows).toHaveLength(1);
    expect(prismaMocks.initiativeTargetLinkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-1", targetId: "target-1" } }),
    );
  });

  it("linkInitiativeTarget upserts without duplicating existing pairs", async () => {
    prismaMocks.initiativeFindFirst.mockResolvedValue({ id: "init-1" });
    prismaMocks.targetFindFirst.mockResolvedValue({ id: "target-1" });
    prismaMocks.initiativeTargetLinkUpsert.mockResolvedValue({ id: "link-1" });

    await linkInitiativeTarget("tenant-1", "init-1", "target-1");

    expect(prismaMocks.initiativeTargetLinkUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { initiativeId_targetId: { initiativeId: "init-1", targetId: "target-1" } },
        update: {},
      }),
    );
  });
});