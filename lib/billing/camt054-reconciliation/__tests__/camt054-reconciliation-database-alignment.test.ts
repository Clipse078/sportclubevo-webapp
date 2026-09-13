import { describe, expect, it } from "vitest";
import { assertCamt054ReconciliationDatabaseAlignment } from "../camt054-reconciliation-database-alignment";

const STAGE_URL =
  "postgresql://u:p@ep-wispy-hall-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";
const OTHER_URL =
  "postgresql://u:p@ep-other-branch-aso93dy6-pooler.c-4.eu-central-1.aws.neon.tech/neondb";

describe("assertCamt054ReconciliationDatabaseAlignment", () => {
  it("passes when Preview DATABASE_URL matches STAGE_DB_URL fingerprint", () => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        DATABASE_URL: STAGE_URL,
        STAGE_DB_URL: STAGE_URL,
      }),
    ).not.toThrow();
  });

  it("throws when Preview DATABASE_URL targets a different database than STAGE_DB_URL", () => {
    expect(() => {
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        DATABASE_URL: OTHER_URL,
        STAGE_DB_URL: STAGE_URL,
      });
    }).toThrow(
      expect.objectContaining({
        code: "PREVIEW_NOT_TARGETING_STAGE_DB",
        message: expect.stringMatching(/nicht mit der STAGE-Datenbank verbunden/i),
      }),
    );
  });

  it("throws when both Preview variables agree on the same non-STAGE database", () => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        DATABASE_URL: OTHER_URL,
        STAGE_DB_URL: OTHER_URL,
      }),
    ).toThrow(
      expect.objectContaining({ code: "PREVIEW_NOT_TARGETING_STAGE_DB" }),
    );
  });

  it.each([
    ["missing DATABASE_URL", { STAGE_DB_URL: STAGE_URL }],
    ["missing STAGE_DB_URL", { DATABASE_URL: STAGE_URL }],
    [
      "unparseable STAGE_DB_URL",
      { DATABASE_URL: STAGE_URL, STAGE_DB_URL: "not-a-postgres-url" },
    ],
  ])("fails closed when alignment is unprovable: %s", (_label, urls) => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
        APP_ENV: "preview",
        ...urls,
      }),
    ).toThrow(
      expect.objectContaining({ code: "PREVIEW_NOT_TARGETING_STAGE_DB" }),
    );
  });

  it("does not block STAGE production reconciliation", () => {
    expect(() =>
      assertCamt054ReconciliationDatabaseAlignment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
        APP_ENV: "stage",
        DATABASE_URL: STAGE_URL,
        STAGE_DB_URL: STAGE_URL,
      }),
    ).not.toThrow();
  });
});
