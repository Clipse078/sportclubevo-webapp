/**
 * SCE-DS2-07G — isolated functional mutation smoke (representative workflows).
 *
 * Requires SCE_DS2_07G_VERIFICATION_MODE=isolated and authorization env vars.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import {
  assertSafeVerificationDatabaseUrl,
  fingerprintVerificationDatabase,
  loadVerificationFixtureManifest,
} from "./lib/sce-ds2-07g-verification-database.mjs";

const EVIDENCE_PATH = join(
  process.cwd(),
  "lib/design-system/sce-ds2-07g-mutation-evidence.json",
);

const CONFIRM = "SCE_DS2_07G_ISOLATED_VERIFICATION_MUTATION";
const AUTHZ = "sce-ds2-07g-verification:local";

function requireIsolatedAuthorization() {
  if (process.env.SCE_DS2_07G_VERIFICATION_MODE?.trim() !== "isolated") {
    throw new Error("Refused: SCE_DS2_07G_VERIFICATION_MODE=isolated is required.");
  }
  if (process.env.SCE_DS2_07G_VERIFICATION_CONFIRM !== CONFIRM) {
    throw new Error("Refused: SCE_DS2_07G_VERIFICATION_CONFIRM mismatch.");
  }
  if (process.env.SCE_OPERATION_AUTHORIZATION?.trim() !== AUTHZ) {
    throw new Error("Refused: SCE_OPERATION_AUTHORIZATION mismatch.");
  }
}

async function main() {
  requireIsolatedAuthorization();
  const databaseUrl = assertSafeVerificationDatabaseUrl();
  const fixtureManifest = loadVerificationFixtureManifest();
  if (!fixtureManifest?.fixtures?.requirementId) {
    throw new Error("Refused: verification fixture manifest missing.");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  const results = [];

  await client.connect();
  try {
    const identity = await client.query(`SELECT current_database() AS db, current_user AS role`);
    results.push({
      workflow: "connection_identity",
      status: "PASS",
      details: {
        fingerprint: fingerprintVerificationDatabase(databaseUrl),
        database: identity.rows[0]?.db,
        role: identity.rows[0]?.role,
      },
    });

    const requirementId = fixtureManifest.fixtures.requirementId;
    const before = await client.query(`SELECT title FROM "Requirement" WHERE id = $1`, [requirementId]);
    const nextTitle = `${before.rows[0]?.title ?? "Requirement"} (mutation-check)`;
    await client.query(`UPDATE "Requirement" SET title = $1, "updatedAt" = NOW() WHERE id = $2`, [
      nextTitle,
      requirementId,
    ]);
    const after = await client.query(`SELECT title FROM "Requirement" WHERE id = $1`, [requirementId]);
    const pass = after.rows[0]?.title === nextTitle;
    await client.query(`UPDATE "Requirement" SET title = $1, "updatedAt" = NOW() WHERE id = $2`, [
      before.rows[0]?.title ?? "Verification requirement",
      requirementId,
    ]);
    results.push({
      workflow: "requirement_title_mutation_roundtrip",
      status: pass ? "PASS" : "FAIL",
      cleanupStatus: "reverted",
      fixtureIds: { requirementId },
    });

    const newsId = fixtureManifest.fixtures.newsArticleId;
    const newsBefore = await client.query(`SELECT title FROM "NewsArticle" WHERE id = $1`, [newsId]);
    const newsTitle = `${newsBefore.rows[0]?.title ?? "News"} (mutation-check)`;
    await client.query(`UPDATE "NewsArticle" SET title = $1, "updatedAt" = NOW() WHERE id = $2`, [
      newsTitle,
      newsId,
    ]);
    const newsAfter = await client.query(`SELECT title FROM "NewsArticle" WHERE id = $1`, [newsId]);
    const newsPass = newsAfter.rows[0]?.title === newsTitle;
    await client.query(`UPDATE "NewsArticle" SET title = $1, "updatedAt" = NOW() WHERE id = $2`, [
      newsBefore.rows[0]?.title ?? "Verification news article",
      newsId,
    ]);
    results.push({
      workflow: "news_title_mutation_roundtrip",
      status: newsPass ? "PASS" : "FAIL",
      cleanupStatus: "reverted",
      fixtureIds: { newsArticleId: newsId },
    });
  } finally {
    await client.end();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    verificationEnvironment: {
      mode: "isolated",
      databaseFingerprint: fingerprintVerificationDatabase(databaseUrl),
      fixtureManifestVersion: fixtureManifest.version,
    },
    executed: results.length,
    pass: results.filter((row) => row.status === "PASS").length,
    fail: results.filter((row) => row.status === "FAIL").length,
    results,
  };

  writeFileSync(EVIDENCE_PATH, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("[sce-ds2-07g-functional-mutation-harness] failed", error);
  process.exit(1);
});
