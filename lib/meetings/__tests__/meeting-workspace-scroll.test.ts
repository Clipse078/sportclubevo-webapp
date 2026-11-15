// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  measureMeetingWorkspaceScrollOffset,
  scrollMeetingWorkspaceSectionHeading,
} from "@/lib/meetings/meeting-workspace-scroll";

describe("meeting workspace scroll offset", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("sums app header and section nav heights", () => {
    const header = document.createElement("header");
    header.className = "sce-global-app-header";
    Object.defineProperty(header, "getBoundingClientRect", {
      value: () => ({ height: 56, top: 0, bottom: 56 }),
    });
    const nav = document.createElement("nav");
    Object.defineProperty(nav, "getBoundingClientRect", {
      value: () => ({ height: 40, top: 56, bottom: 96 }),
    });
    document.body.append(header, nav);

    expect(measureMeetingWorkspaceScrollOffset(nav)).toBe(104);
  });

  it("scrolls heading below combined sticky offset", () => {
    const heading = document.createElement("h2");
    Object.defineProperty(heading, "getBoundingClientRect", {
      value: () => ({ top: 200, height: 24 }),
    });
    const nav = document.createElement("nav");
    Object.defineProperty(nav, "getBoundingClientRect", {
      value: () => ({ height: 40 }),
    });
    const header = document.createElement("header");
    header.className = "sce-global-app-header";
    Object.defineProperty(header, "getBoundingClientRect", {
      value: () => ({ height: 60 }),
    });
    document.body.append(header);

    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 10000,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    scrollMeetingWorkspaceSectionHeading(heading, nav);
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 200 - 108, behavior: "smooth" }),
    );
  });
});