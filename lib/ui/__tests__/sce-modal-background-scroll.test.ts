/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  captureSceBackgroundScrollPositions,
  restoreSceBackgroundScrollPositions,
  SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR,
  SCE_PLANNER_SCROLL_ROOT_ATTR,
} from "@/lib/ui/sce-modal-background-scroll";
import {
  applySceModalOpenSideEffects,
  releaseSceModalOpenSideEffects,
} from "@/lib/ui/sce-modal-open-lifecycle";

describe("sce-modal-background-scroll SCE-RESPONSIVE-01K", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 700, writable: true, configurable: true });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("captures and restores window and planner scroll roots", () => {
    const planner = document.createElement("div");
    planner.setAttribute(SCE_PLANNER_SCROLL_ROOT_ATTR, "");
    planner.scrollTop = 940;
    planner.scrollLeft = 0;
    Object.defineProperty(planner, "scrollTop", { value: 940, writable: true, configurable: true });
    Object.defineProperty(planner, "scrollLeft", { value: 0, writable: true, configurable: true });

    const calendar = document.createElement("div");
    calendar.setAttribute(SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR, "");
    Object.defineProperty(calendar, "scrollTop", { value: 610, writable: true, configurable: true });
    Object.defineProperty(calendar, "scrollLeft", { value: 420, writable: true, configurable: true });
    calendar.scrollTop = 610;
    calendar.scrollLeft = 420;

    document.body.append(planner, calendar);

    const snapshot = captureSceBackgroundScrollPositions();
    expect(snapshot.windowScrollY).toBe(700);
    expect(snapshot.containers).toHaveLength(2);

    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation((x, y) => {
      if (typeof x === "number" && typeof y === "number") {
        window.scrollY = y;
        window.scrollX = x;
      }
    });

    window.scrollY = 0;
    planner.scrollTop = 0;
    calendar.scrollLeft = 0;

    restoreSceBackgroundScrollPositions(snapshot);
    expect(window.scrollY).toBe(700);
    expect(scrollToSpy).toHaveBeenCalled();
    scrollToSpy.mockRestore();
    expect(planner.scrollTop).toBe(940);
    expect(calendar.scrollLeft).toBe(420);
  });

  it("open lifecycle focuses modal before inert without mutating scroll", () => {
    const background = document.createElement("div");
    background.setAttribute("data-sce-modal-background", "");
    const trigger = document.createElement("button");
    trigger.textContent = "Cluster";
    const title = document.createElement("h2");
    title.tabIndex = -1;
    background.append(trigger);
    document.body.append(background, title);

    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const focusSpy = vi.spyOn(title, "focus");

    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    const { previousFocus, scrollSnapshot } = applySceModalOpenSideEffects({
      initialFocusTarget: title,
      backgroundRoots: [background],
    });

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(background.hasAttribute("inert")).toBe(true);
    expect(previousFocus).toBe(trigger);
    expect(window.scrollY).toBe(700);
    expect(scrollToSpy).not.toHaveBeenCalled();

    releaseSceModalOpenSideEffects({
      backgroundRoots: [background],
      previousFocus,
      scrollSnapshot,
    });

    expect(background.hasAttribute("inert")).toBe(false);
    focusSpy.mockRestore();
    scrollToSpy.mockRestore();
  });
});
