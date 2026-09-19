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

function defineScrollProps(el: HTMLElement, scrollTop: number, scrollLeft: number) {
  Object.defineProperty(el, "scrollTop", { value: scrollTop, writable: true, configurable: true });
  Object.defineProperty(el, "scrollLeft", { value: scrollLeft, writable: true, configurable: true });
  el.scrollTop = scrollTop;
  el.scrollLeft = scrollLeft;
}

describe("sce-modal-background-scroll utility", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 700, writable: true, configurable: true });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("captures and restores explicit scroll roots when called directly", () => {
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

    const snapshot = captureSceBackgroundScrollPositions();
    expect(snapshot.containers).toHaveLength(3);

    planner.scrollTop = 0;
    sidebar.scrollTop = 0;

    restoreSceBackgroundScrollPositions(snapshot);
    expect(sidebar.scrollTop).toBe(315);
    expect(planner.scrollTop).toBe(610);
    expect(calendar.scrollLeft).toBe(420);
  });
});
