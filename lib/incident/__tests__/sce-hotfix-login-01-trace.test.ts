import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("sce-hotfix-login-01-trace ledger", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.SCE_HOTFIX_LOGIN_01_TRACE = "1";
    process.env.VERCEL_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("records duplicate probes within one request", async () => {
    const trace = await import("@/lib/incident/sce-hotfix-login-01-trace");
    trace.resetSceHotfixLogin01TraceForTests();

    trace.recordSceHotfixLogin01DuplicateProbe("getActiveTenant()");
    trace.recordSceHotfixLogin01DuplicateProbe("getActiveTenant()");

    const state = trace.getSceHotfixLogin01TraceStateForTests();
    expect(state.duplicateProbeCounts["getActiveTenant()"]).toBe(2);
  });
});
