/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import {
  acquireSceModalOpenState,
  resetSceModalOpenStateForTests,
} from "@/lib/ui/sce-modal-open-state";
import {
  attachSidebarScrollFreezeWhileModalOpen,
  attemptSidebarScrollMutation,
} from "@/lib/shell/sidebar-modal-scroll-freeze";

function createNav(initialScrollTop: number) {
  const nav = document.createElement("nav");
  nav.id = "admin-sidebar-nav";
  nav.setAttribute("data-sce-sidebar-scroll-root", "");
  nav.style.height = "200px";
  nav.style.overflow = "auto";
  const inner = document.createElement("div");
  inner.style.height = "2000px";
  nav.append(inner);
  document.body.append(nav);
  nav.scrollTop = initialScrollTop;
  return nav;
}

describe("sidebar-modal-scroll-freeze SCE-RESPONSIVE-01O", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    resetSceModalOpenStateForTests();
  });

  afterEach(() => {
    resetSceModalOpenStateForTests();
    document.body.innerHTML = "";
  });

  it("scenario A — freezes at 0, blocks mutation, unlocks after modal closes", () => {
    const nav = createNav(0);
    const detach = attachSidebarScrollFreezeWhileModalOpen(nav);
    const release = acquireSceModalOpenState();

    expect(nav.scrollTop).toBe(0);
    attemptSidebarScrollMutation(nav, 450);
    expect(nav.scrollTop).toBe(0);

    release();
    expect(nav.scrollTop).toBe(0);

    nav.scrollTop = 450;
    nav.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(nav.scrollTop).toBe(450);

    detach();
  });

  it("scenario B — freezes at 375 through mutation attempts", () => {
    const nav = createNav(375);
    const detach = attachSidebarScrollFreezeWhileModalOpen(nav);
    const release = acquireSceModalOpenState();

    expect(nav.scrollTop).toBe(375);
    attemptSidebarScrollMutation(nav, 700);
    expect(nav.scrollTop).toBe(375);

    release();
    expect(nav.scrollTop).toBe(375);

    nav.scrollTop = 700;
    expect(nav.scrollTop).toBe(700);

    detach();
  });

  it("Michael screenshot regression — Dashboard region (X≈0) stays frozen for modal lifetime", () => {
    const nav = createNav(0);
    const detach = attachSidebarScrollFreezeWhileModalOpen(nav);
    const release = acquireSceModalOpenState();

    const jumpedScrollTop = 420;
    attemptSidebarScrollMutation(nav, jumpedScrollTop);
    expect(nav.scrollTop).toBe(0);

    release();
    expect(nav.scrollTop).toBe(0);
    detach();
  });

  it("nested modals — remains frozen until final overlay releases", () => {
    const nav = createNav(375);
    const detach = attachSidebarScrollFreezeWhileModalOpen(nav);
    const releaseA = acquireSceModalOpenState();
    const releaseB = acquireSceModalOpenState();

    attemptSidebarScrollMutation(nav, 900);
    expect(nav.scrollTop).toBe(375);

    releaseB();
    expect(nav.scrollTop).toBe(375);

    releaseA();
    expect(nav.scrollTop).toBe(375);

    nav.scrollTop = 900;
    expect(nav.scrollTop).toBe(900);
    detach();
  });
});
