import "@testing-library/jest-dom";
import { vi } from "vitest";
import { applyConfiguredTestDatabaseUrlToProcessEnv } from "./lib/test/safe-test-database";

vi.mock("server-only", () => ({}));

vi.mock("next/server", async () => import("next/server.js"));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

// When TEST_DATABASE_URL is explicitly configured and passes the guard, wire it
// into DATABASE_URL before any test module imports `@/lib/db/prisma`.
applyConfiguredTestDatabaseUrlToProcessEnv();
