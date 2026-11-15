// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  computeSectionScrollTop,
  createProgrammaticScrollLock,
  shouldSuppressScrollSpy,
} from "@/lib/meetings/meeting-workspace-section-navigation";

describe("meeting workspace section navigation helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suppresses scroll spy only while programmatic lock is active", () => {
    const lock = createProgrammaticScrollLock("beschluesse", 500);
    expect(shouldSuppressScrollSpy(lock, Date.now())).toBe(true);
    expect(shouldSuppressScrollSpy(lock, Date.now() + 600)).toBe(false);
    expect(shouldSuppressScrollSpy(null)).toBe(false);
  });

  it("clamps scroll top for short documents", () => {
    const heading = {
      getBoundingClientRect: () => ({ top: 5000, height: 20 }),
    } as HTMLElement;
    const nav = {
      getBoundingClientRect: () => ({ height: 48 }),
    } as HTMLElement;

    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });

    const top = computeSectionScrollTop(heading, nav);
    expect(top).toBe(1200);
  });
});