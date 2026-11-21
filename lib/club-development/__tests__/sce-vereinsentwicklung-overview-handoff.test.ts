import { describe, expect, it } from "vitest";
import {
  buildVereinsentwicklungOverviewHandoffUrls,
  VEREINSENTWICKLUNG_OVERVIEW_PO_CHECKLIST_1280,
  VEREINSENTWICKLUNG_OVERVIEW_PULL_REQUEST,
} from "../sce-vereinsentwicklung-overview-handoff";
import { STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID } from "../sce-cd-connected-workspace-po-uat-handoff";

describe("Vereinsentwicklung overview PO handoff URLs", () => {
  const sha = "aabbccddeeff00112233445566778899aabbccdd";

  it("binds unfiltered and Junioren Übersicht URLs to commit", () => {
    const urls = buildVereinsentwicklungOverviewHandoffUrls("https://preview.example.com", sha);
    expect(urls.uebersichtUnfiltered).toBe(
      "https://preview.example.com/vereinsleitung/club-entwicklung?dpl=aabbccddeeff",
    );
    expect(urls.uebersichtJunioren).toContain(STAGE_PREVIEW_JUNIOREN_ORG_UNIT_ID);
    expect(urls.uebersichtJunioren).toContain("dpl=aabbccddeeff");
    expect(urls.strategieJunioren).toContain("ansicht=strategie");
    expect(urls.zieleJunioren).toContain("ansicht=ziele");
    expect(urls.aufgabenJunioren).toContain("ansicht=aufgaben");
    expect(urls.umsetzungsphasenJunioren).toContain("ansicht=umsetzungsphasen");
    expect(urls.umsetzungJuniorenUngeplant).toContain("umsetzungsabschnitt=ungeplant");
    expect(urls.strategieJunioren).toContain("dpl=aabbccddeeff");
  });

  it("documents 1280px PO checklist for the three preview sections", () => {
    expect(VEREINSENTWICKLUNG_OVERVIEW_PULL_REQUEST).toBe(1023);
    expect(VEREINSENTWICKLUNG_OVERVIEW_PO_CHECKLIST_1280.length).toBeGreaterThanOrEqual(6);
    expect(VEREINSENTWICKLUNG_OVERVIEW_PO_CHECKLIST_1280.join(" ")).toContain("1280");
    expect(VEREINSENTWICKLUNG_OVERVIEW_PO_CHECKLIST_1280.join(" ")).toContain("column track");
  });
});