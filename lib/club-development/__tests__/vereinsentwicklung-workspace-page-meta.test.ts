import { describe, expect, it } from "vitest";
import {
  CD_CONNECTED_WORKSPACE_EYEBROW,
  connectedWorkspacePageMeta,
  resolveConnectedViewFromStrategieUndZieleAnsicht,
  resolveConnectedViewFromVorhabenUndUmsetzungAnsicht,
} from "../vereinsentwicklung-workspace-page-meta";
import {
  buildConnectedWorkspaceHref,
  CD_WORKSPACE_ORG_UNIT_QUERY,
} from "../vereinsentwicklung-connected-workspace";

describe("Connected workspace page meta", () => {
  it("uses active view label in title and breadcrumb leaf", () => {
    const meta = connectedWorkspacePageMeta("aufgaben");
    expect(meta.title).toBe("Aufgaben");
    expect(meta.breadcrumbs.at(-1)?.label).toBe("Aufgaben");
    expect(CD_CONNECTED_WORKSPACE_EYEBROW).toBe("Vereinsentwicklung");
  });

  it("maps legacy ansicht values to five-tab connected views", () => {
    expect(resolveConnectedViewFromStrategieUndZieleAnsicht("ziele")).toBe("ziele");
    expect(resolveConnectedViewFromStrategieUndZieleAnsicht("strategie")).toBe("strategien");
    expect(resolveConnectedViewFromVorhabenUndUmsetzungAnsicht("aufgaben")).toBe("aufgaben");
    expect(resolveConnectedViewFromVorhabenUndUmsetzungAnsicht("umsetzungsphasen")).toBe(
      "umsetzungsplanung",
    );
  });

  it("carries orgEinheit filter across tab href builders", () => {
    const orgId = "org-junioren";
    const href = buildConnectedWorkspaceHref("ziele", { [CD_WORKSPACE_ORG_UNIT_QUERY]: orgId });
    expect(href).toContain(`${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(orgId)}`);
  });
});