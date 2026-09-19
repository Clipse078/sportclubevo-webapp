/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  captureSceBackgroundScrollPositions,
  restoreSceBackgroundScrollPositions,
  SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR,
  SCE_PLANNER_SCROLL_ROOT_ATTR,
  SCE_SIDEBAR_SCROLL_ROOT_ATTR,
} from "@/lib/ui/sce-modal-background-scroll";
import {
  applySceModalOpenSideEffects,
  releaseSceModalOpenSideEffects,
} from "@/lib/ui/sce-modal-open-lifecycle";

function defineScrollProps(el: HTMLElement, scrollTop: number, scrollLeft: number) {
  Object.defineProperty(el, "scrollTop", { value: scrollTop, writable: true, configurable: true });
  Object.defineProperty(el, "scrollLeft", { value: scrollLeft, writable: true, configurable: true });
  el.scrollTop = scrollTop;
  el.scrollLeft = scrollLeft;
}

describe("sce-modal-background-scroll SCE-RESPONSIVE-01K/01M", () => {
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
    defineScrollProps(planner, 940, 0);

    const calendar = document.createElement("div");
    calendar.setAttribute(SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR, "");
    defineScrollProps(calendar, 610, 420);

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

  it("preserves sidebar scrollTop at 0 through modal open lifecycle", () => {
    const sidebar = document.createElement("nav");
    sidebar.setAttribute(SCE_SIDEBAR_SCROLL_ROOT_ATTR, "");
    defineScrollProps(sidebar, 0, 0);

    const background = document.createElement("div");
    background.setAttribute("data-sce-modal-background", "");
    background.append(sidebar);
    document.body.append(background);

    const title = document.createElement("h2");
    title.tabIndex = -1;
    document.body.append(title);

    const { previousFocus, scrollSnapshot } = applySceModalOpenSideEffects({
      initialFocusTarget: title,
      backgroundRoots: [background],
    });

    expect(sidebar.scrollTop).toBe(0);
    expect(sidebar.scrollLeft).toBe(0);

    releaseSceModalOpenSideEffects({
      backgroundRoots: [background],
      previousFocus,
      scrollSnapshot,
    });

    expect(sidebar.scrollTop).toBe(0);
  });

  it("preserves sidebar scrollTop at 375 through modal open lifecycle", () => {
    const sidebar = document.createElement("nav");
    sidebar.setAttribute(SCE_SIDEBAR_SCROLL_ROOT_ATTR, "");
    defineScrollProps(sidebar, 375, 0);

    const background = document.createElement("div");
    background.setAttribute("data-sce-modal-background", "");
    background.append(sidebar);
    document.body.append(background);

    const title = document.createElement("h2");
    title.tabIndex = -1;
    document.body.append(title);

    const { previousFocus, scrollSnapshot } = applySceModalOpenSideEffects({
      initialFocusTarget: title,
      backgroundRoots: [background],
    });

    expect(sidebar.scrollTop).toBe(375);

    releaseSceModalOpenSideEffects({
      backgroundRoots: [background],
      previousFocus,
      scrollSnapshot,
    });

    expect(sidebar.scrollTop).toBe(375);
  });

  it("preserves all scroll owners simultaneously (canonical stationary-background contract)", () => {
    const sidebar = document.createElement("nav");
    sidebar.setAttribute(SCE_SIDEBAR_SCROLL_ROOT_ATTR, "");
    defineScrollProps(sidebar, 315, 0);

    const planner = document.createElement("div");
    planner.setAttribute(SCE_PLANNER_SCROLL_ROOT_ATTR, "");
    defineScrollProps(planner, 610, 180);

    const calendar = document.createElement("div");
    calendar.setAttribute(SCE_PLANNER_CALENDAR_SCROLL_ROOT_ATTR, "");
    defineScrollProps(calendar, 0, 420);

    document.body.append(sidebar, planner, calendar);

    const background = document.createElement("div");
    background.setAttribute("data-sce-modal-background", "");
    document.body.prepend(background);

    const title = document.createElement("h2");
    title.tabIndex = -1;
    document.body.append(title);

    const snapshot = captureSceBackgroundScrollPositions();
    expect(snapshot.windowScrollY).toBe(700);
    expect(snapshot.containers).toHaveLength(3);

    const { previousFocus, scrollSnapshot } = applySceModalOpenSideEffects({
      initialFocusTarget: title,
      backgroundRoots: [background],
    });

    expect(window.scrollY).toBe(700);
    expect(sidebar.scrollTop).toBe(315);
    expect(planner.scrollTop).toBe(610);
    expect(planner.scrollLeft).toBe(180);
    expect(calendar.scrollLeft).toBe(420);

    releaseSceModalOpenSideEffects({
      backgroundRoots: [background],
      previousFocus,
      scrollSnapshot,
    });

    expect(window.scrollY).toBe(700);
    expect(sidebar.scrollTop).toBe(315);
    expect(planner.scrollTop).toBe(610);
    expect(planner.scrollLeft).toBe(180);
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
