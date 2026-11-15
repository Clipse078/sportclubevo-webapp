import { describe, expect, it } from "vitest";
import {
  buildMeetingWorkspaceLocationHref,
  LEGACY_MEETING_SECTION_HASH_TO_TAB,
  resolveMeetingWorkspaceTabFromBereichParam,
  resolveMeetingWorkspaceTabFromHash,
} from "@/lib/meetings/meeting-workspace-section-url";
import { meetingWorkspaceSectionDomId } from "@/lib/nav/meeting-workspace-tab-config";

describe("meeting workspace section URL", () => {
  it("maps stable workspace section hashes", () => {
    expect(resolveMeetingWorkspaceTabFromHash("#meeting-workspace-section-pendenzen")).toBe("pendenzen");
    expect(resolveMeetingWorkspaceTabFromHash("meeting-workspace-section-traktanden")).toBe("traktanden");
  });

  it("translates legacy in-page section hashes", () => {
    expect(resolveMeetingWorkspaceTabFromHash("#meeting-section-beschlüsse")).toBe("beschluesse");
    expect(LEGACY_MEETING_SECTION_HASH_TO_TAB["meeting-section-aufgaben"]).toBe("pendenzen");
  });

  it("reads legacy bereich query values", () => {
    expect(resolveMeetingWorkspaceTabFromBereichParam("teilnehmer")).toBe("teilnehmer");
    expect(resolveMeetingWorkspaceTabFromBereichParam("nope")).toBeNull();
  });

  it("builds hrefs with preserved query params and without bereich", () => {
    const params = new URLSearchParams({ bereich: "details", foo: "bar" });
    const href = buildMeetingWorkspaceLocationHref({
      pathname: "/vereinsleitung/meetings/demo",
      searchParams: params,
      tab: "details",
    });
    expect(href).toBe(
      `/vereinsleitung/meetings/demo?foo=bar#${meetingWorkspaceSectionDomId("details")}`,
    );
  });
});