import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  mapBacklogRowToVorhabenCardSummary,
  mapWorkspaceInitiativeToVorhabenCardSummary,
} from "../vorhaben-workspace-card-mappers";
import { CD_WORKSPACE_VORHABEN_EXPAND_QUERY } from "../vereinsentwicklung-workspace-routing";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 expandable Vorhaben cards in Vorhaben & Umsetzung", () => {
  it("shares VorhabenCollapsibleCard between Prioritäten and Aufgaben views", () => {
    expect(read("components/admin/club-development/InitiativeBacklogWorkspace.tsx")).toContain(
      "VorhabenWorkspaceCardList",
    );
    expect(read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx")).toContain(
      "VorhabenWorkspaceCardList",
    );
    expect(read("components/admin/club-development/VorhabenWorkspaceCardList.tsx")).toContain(
      "VorhabenCollapsibleCard",
    );
  });

  it("exposes collapsed summary fields and aria-expanded on Vorhaben cards", () => {
    const card = read("components/admin/club-development/VorhabenCollapsibleCard.tsx");
    expect(card).toContain("aria-expanded");
    expect(card).toContain("Umsetzungsfortschritt");
    expect(card).toContain("Nächster Meilenstein");
    expect(card).toContain("Detailseite öffnen");
    expect(card).toContain("workspace-panel");
  });

  it("lazy-loads expanded panel via dedicated API (no eager full task tree)", () => {
    expect(read("lib/club-development/vorhaben-workspace-card.ts")).toContain("parentTaskId: null");
    expect(read("lib/club-development/vorhaben-workspace-card.ts")).toContain(
      "VORHABEN_WORKSPACE_ROOT_TASK_DISPLAY_LIMIT",
    );
    expect(read("components/admin/club-development/VorhabenCollapsibleCard.tsx")).toContain(
      "vorhaben-root-tasks-truncation",
    );
    expect(read("app/api/club-development/initiatives/[id]/workspace-panel/route.ts")).toContain(
      "loadVorhabenWorkspacePanel",
    );
    expect(read("components/admin/club-development/VorhabenCollapsibleCard.tsx")).not.toContain(
      "parentTaskId",
    );
  });

  it("preserves expanded card id in URL query state", () => {
    expect(CD_WORKSPACE_VORHABEN_EXPAND_QUERY).toBe("vorhabenExpand");
    expect(read("components/admin/club-development/VorhabenWorkspaceCardList.tsx")).toContain(
      "CD_WORKSPACE_VORHABEN_EXPAND_QUERY",
    );
  });

  it("maps backlog and workspace rows to the same card summary shape", () => {
    const backlog = mapBacklogRowToVorhabenCardSummary({
      id: "i1",
      slug: "alpha",
      title: "Alpha",
      status: "IN_PROGRESS",
      owner: "Ada",
      summary: null,
      backlogPriority: 2,
      disposition: "NONE",
      deliveryProgressPercent: 40,
      nextMilestone: { title: "M1", targetDate: null },
    });
    const workspace = mapWorkspaceInitiativeToVorhabenCardSummary({
      id: "i1",
      slug: "alpha",
      title: "Alpha",
      status: "IN_PROGRESS",
      statusLabel: "In Arbeit",
      deliveryProgressPercent: 40,
      detailHref: "/vereinsleitung/initiativen/alpha",
      ownerLabel: "Ada",
      nextMilestone: { title: "M1", targetDate: null },
    });
    expect(backlog.id).toBe(workspace.id);
    expect(backlog.deliveryProgressPercent).toBe(40);
    expect(backlog.nextMilestone?.title).toBe("M1");
  });
});