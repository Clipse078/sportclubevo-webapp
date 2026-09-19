/**
 * @vitest-environment jsdom
 *
 * SCE-RESPONSIVE-01N — isolate which modal operations write sidebar scrollTop.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  applySceModalOpenSideEffects,
  releaseSceModalOpenSideEffects,
  setSceModalBackgroundHidden,
} from "@/lib/ui/sce-modal-open-lifecycle";
import {
  applySceDocumentScrollLock,
  captureSceDocumentScrollSnapshot,
} from "@/lib/ui/sce-modal-scroll-lock";
import { sceFocusWithoutScroll } from "@/lib/ui/sce-modal-focus";
import { SCE_SIDEBAR_SCROLL_ROOT_ATTR } from "@/lib/ui/sce-modal-background-scroll";

function installSidebarScrollTopSpy(sidebar: HTMLElement) {
  let value = 0;
  const sets: number[] = [];
  Object.defineProperty(sidebar, "scrollTop", {
    configurable: true,
    get: () => value,
    set: (next: number) => {
      sets.push(next);
      value = next;
    },
  });
  return {
    set(valueNext: number) {
      value = valueNext;
    },
    get() {
      return value;
    },
    sets,
  };
}

function adminShellFixture(scrollTop: number) {
  const background = document.createElement("div");
  background.setAttribute("data-sce-modal-background", "");

  const sidebar = document.createElement("nav");
  sidebar.setAttribute(SCE_SIDEBAR_SCROLL_ROOT_ATTR, "");
  sidebar.id = "admin-sidebar-nav";
  sidebar.className = "sce-sidebar-nav overflow-y-auto";
  const spy = installSidebarScrollTopSpy(sidebar);
  spy.set(scrollTop);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.textContent = "Open cluster";
  background.append(sidebar, trigger);

  const title = document.createElement("h2");
  title.tabIndex = -1;
  title.textContent = "Modal title";

  document.body.append(background, title);

  return { background, sidebar, trigger, title, spy };
}

describe("sce-modal-sidebar-scroll-isolation SCE-RESPONSIVE-01N", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Object.defineProperty(window, "scrollY", { value: 700, writable: true, configurable: true });
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  });

  it("A — portal mount is not exercised here; baseline sidebar scrollTop is stable", () => {
    const { spy } = adminShellFixture(0);
    expect(spy.get()).toBe(0);
    expect(spy.sets).toHaveLength(0);
  });

  it("B — modal title focus with preventScroll does not write sidebar scrollTop", () => {
    const { title, spy } = adminShellFixture(375);
    sceFocusWithoutScroll(title);
    expect(spy.get()).toBe(375);
    expect(spy.sets).toHaveLength(0);
  });

  it("C — aria-hidden on shell does not write sidebar scrollTop", () => {
    const { background, spy } = adminShellFixture(375);
    setSceModalBackgroundHidden([background], true);
    expect(spy.get()).toBe(375);
    expect(spy.sets).toHaveLength(0);
    setSceModalBackgroundHidden([background], false);
  });

  it("D — document scroll lock does not write sidebar scrollTop", () => {
    const { spy } = adminShellFixture(375);
    applySceDocumentScrollLock(captureSceDocumentScrollSnapshot());
    expect(spy.get()).toBe(375);
    expect(spy.sets).toHaveLength(0);
  });

  it("E — full open lifecycle does not write sidebar scrollTop (0 and 375)", () => {
    for (const initial of [0, 375] as const) {
      document.body.innerHTML = "";
      const { background, title, spy } = adminShellFixture(initial);

      const { previousFocus, scrollSnapshot } = applySceModalOpenSideEffects({
        initialFocusTarget: title,
        backgroundRoots: [background],
      });

      expect(spy.get()).toBe(initial);
      expect(spy.sets).toHaveLength(0);

      applySceDocumentScrollLock(captureSceDocumentScrollSnapshot());
      expect(spy.get()).toBe(initial);
      expect(spy.sets).toHaveLength(0);

      releaseSceModalOpenSideEffects({
        backgroundRoots: [background],
        previousFocus,
        scrollSnapshot,
      });

      expect(spy.get()).toBe(initial);
      expect(spy.sets).toHaveLength(0);
    }
  });

  it("F — open lifecycle no longer toggles native inert on the admin shell", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "lib/ui/sce-modal-open-lifecycle.ts"), "utf8");
    expect(source).not.toContain('setAttribute("inert"');
    expect(source).toContain("aria-hidden");
  });

  it("G — restore trigger focus uses preventScroll and does not write sidebar scrollTop", () => {
    const { background, trigger, title, spy } = adminShellFixture(375);
    trigger.focus();
    const { previousFocus, scrollSnapshot } = applySceModalOpenSideEffects({
      initialFocusTarget: title,
      backgroundRoots: [background],
    });
    expect(spy.sets).toHaveLength(0);

    const focusSpy = vi.spyOn(trigger, "focus");
    releaseSceModalOpenSideEffects({
      backgroundRoots: [background],
      previousFocus,
      scrollSnapshot,
    });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(spy.sets).toHaveLength(0);
    focusSpy.mockRestore();
  });
});
