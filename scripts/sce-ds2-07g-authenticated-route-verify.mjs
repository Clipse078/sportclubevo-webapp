/**
 * SCE-DS2-07G — authenticated Playwright verification (batch-3 evidence contract).
 *
 * Requires:
 *   SCE_DS2_07G_LOGIN_EMAIL
 *   SCE_DS2_07G_LOGIN_PASSWORD
 *   SCE_DS2_07G_BASE_URL (default http://127.0.0.1:3000)
 *   AUTH_SECRET or NEXTAUTH_SECRET on the app server (required for Auth.js session cookies)
 *
 * Optional:
 *   SCE_DS2_07G_MODE=reassess-batch2|reassess-evidence|batch3|high-risk (default reassess-batch2)
 *   SCE_DS2_07G_ROUTE_LIMIT=40
 *   SCE_DS2_07G_ROUTE_OFFSET=0
 *
 * Run: node scripts/sce-ds2-07g-authenticated-route-verify.mjs
 */
import { createRequire } from "node:module";
import { chromium } from "playwright";
import pg from "pg";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_CONTRACT_VERSION,
  VIEWPORT_KEYS,
  deriveLegacyChannelsFromDimensions,
  resolveAccessibilityDimension,
  resolveFunctionalDimension,
} from "./lib/sce-ds2-07g-evidence-contract.mjs";
import {
  buildVerificationMatrix,
  inferPageArchetype,
  isHighRiskRoute,
  loadRegistryEntries,
  selectBatch3Routes,
  summarizeMatrix,
} from "./lib/sce-ds2-07g-verification.mjs";
import {
  assertSafeVerificationDatabaseUrl,
  fingerprintVerificationDatabase,
  loadVerificationFixtureManifest,
  maskDatabaseUrl,
} from "./lib/sce-ds2-07g-verification-database.mjs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const ROOT = process.cwd();
const BASE_URL = process.env.SCE_DS2_07G_BASE_URL?.trim() || "http://localhost:3000";
const EMAIL = process.env.SCE_DS2_07G_LOGIN_EMAIL?.trim();
const PASSWORD = process.env.SCE_DS2_07G_LOGIN_PASSWORD?.trim();
const MODE = process.env.SCE_DS2_07G_MODE?.trim() || "reassess-batch2";
const ROUTE_LIMIT = Number.parseInt(process.env.SCE_DS2_07G_ROUTE_LIMIT ?? "41", 10);
const ROUTE_OFFSET = Number.parseInt(process.env.SCE_DS2_07G_ROUTE_OFFSET ?? "0", 10);
const SOURCE_FILE_FILTER = process.env.SCE_DS2_07G_SOURCE_FILES?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ARTIFACT_DIR = "/opt/cursor/artifacts/sce-ds2-07g";
const EVIDENCE_PATH =
  process.env.SCE_DS2_07G_EVIDENCE_PATH?.trim() ||
  join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");

const VIEWPORTS = [
  { key: "desktop", width: 1440, height: 900 },
  { key: "compactDesktop", width: 1093, height: 900 },
  { key: "tablet", width: 768, height: 1024 },
  { key: "mobile", width: 390, height: 844 },
];

if (!EMAIL || !PASSWORD) {
  console.error(
    "[sce-ds2-07g] Refused: SCE_DS2_07G_LOGIN_EMAIL and SCE_DS2_07G_LOGIN_PASSWORD are required.",
  );
  process.exit(2);
}

/** @type {Record<string, string>} */
let dynamicFixtures = {};

/** @type {Record<string, unknown> | null} */
let verificationEnvironment = null;

function loadExistingManifest() {
  try {
    return JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
  } catch {
    return { bySourceFile: {} };
  }
}

async function resolveVerificationTenantId(client) {
  if (!EMAIL) return null;
  const user = await client.query(`SELECT id FROM "User" WHERE email = $1 LIMIT 1`, [EMAIL]);
  const userId = user.rows[0]?.id;
  if (!userId) return null;
  const membership = await client.query(
    `SELECT "tenantId" FROM "TenantMembership" WHERE "userId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    [userId],
  );
  return membership.rows[0]?.tenantId ?? null;
}

async function loadDynamicFixtures() {
  dynamicFixtures = {
    seriesId: process.env.SCE_DS2_07G_FIXTURE_SERIES_ID?.trim() ?? "",
    sessionId: process.env.SCE_DS2_07G_FIXTURE_SESSION_ID?.trim() ?? "",
    eventId: process.env.SCE_DS2_07G_FIXTURE_EVENT_ID?.trim() ?? "",
    taskId: process.env.SCE_DS2_07G_FIXTURE_TASK_ID?.trim() ?? "",
    clubId: process.env.SCE_DS2_07G_FIXTURE_CLUB_ID?.trim() ?? "",
    pageId: process.env.SCE_DS2_07G_FIXTURE_PAGE_ID?.trim() ?? "",
    componentId: process.env.SCE_DS2_07G_FIXTURE_COMPONENT_ID?.trim() ?? "",
    roleId: process.env.SCE_DS2_07G_FIXTURE_ROLE_ID?.trim() ?? "",
    matchId: process.env.SCE_DS2_07G_FIXTURE_MATCH_ID?.trim() ?? "",
    infoboardId: process.env.SCE_DS2_07G_FIXTURE_INFOBOARD_ID?.trim() ?? "",
    requirementId: process.env.SCE_DS2_07G_FIXTURE_REQUIREMENT_ID?.trim() ?? "",
    recipientId: process.env.SCE_DS2_07G_FIXTURE_RECIPIENT_ID?.trim() ?? "",
    scenarioId: process.env.SCE_DS2_07G_FIXTURE_SCENARIO_ID?.trim() ?? "",
    orgUnitId: process.env.SCE_DS2_07G_FIXTURE_ORG_UNIT_ID?.trim() ?? "",
    userId: process.env.SCE_DS2_07G_FIXTURE_USER_ID?.trim() ?? "",
    tournamentId: process.env.SCE_DS2_07G_FIXTURE_TOURNAMENT_ID?.trim() ?? "",
    entityKey: process.env.SCE_DS2_07G_FIXTURE_ENTITY_KEY?.trim() ?? "",
    tenantSlug: process.env.SCE_DS2_07G_FIXTURE_TENANT_SLUG?.trim() ?? "",
    registrationId: process.env.SCE_DS2_07G_FIXTURE_REGISTRATION_ID?.trim() ?? "",
    teamId: process.env.SCE_DS2_07G_FIXTURE_TEAM_ID?.trim() ?? "",
    personId: process.env.SCE_DS2_07G_FIXTURE_PERSON_ID?.trim() ?? "",
    teamSeasonId: process.env.SCE_DS2_07G_FIXTURE_TEAM_SEASON_ID?.trim() ?? "",
    mappingId: process.env.SCE_DS2_07G_FIXTURE_MAPPING_ID?.trim() ?? "",
    targetGroupId: process.env.SCE_DS2_07G_FIXTURE_TARGET_GROUP_ID?.trim() ?? "",
    communicationId: process.env.SCE_DS2_07G_FIXTURE_COMMUNICATION_ID?.trim() ?? "",
    campaignId: process.env.SCE_DS2_07G_FIXTURE_CAMPAIGN_ID?.trim() ?? "",
    templateId: process.env.SCE_DS2_07G_FIXTURE_TEMPLATE_ID?.trim() ?? "",
    contractKey: process.env.SCE_DS2_07G_FIXTURE_CONTRACT_KEY?.trim() ?? "",
    customerKey: process.env.SCE_DS2_07G_FIXTURE_CUSTOMER_KEY?.trim() ?? "",
    invoiceKey: process.env.SCE_DS2_07G_FIXTURE_INVOICE_KEY?.trim() ?? "",
    importKey: process.env.SCE_DS2_07G_FIXTURE_IMPORT_KEY?.trim() ?? "",
    meetingSlug: process.env.SCE_DS2_07G_FIXTURE_MEETING_SLUG?.trim() ?? "",
    targetId: process.env.SCE_DS2_07G_FIXTURE_TARGET_ID?.trim() ?? "",
    governanceTemplateId: process.env.SCE_DS2_07G_FIXTURE_GOVERNANCE_TEMPLATE_ID?.trim() ?? "",
    adminTenantSlug: process.env.SCE_DS2_07G_FIXTURE_ADMIN_TENANT_SLUG?.trim() ?? "",
    adminUserId: process.env.SCE_DS2_07G_FIXTURE_ADMIN_USER_ID?.trim() ?? "",
    newsArticleId: process.env.SCE_DS2_07G_FIXTURE_NEWS_ARTICLE_ID?.trim() ?? "",
    initiativeSlug: process.env.SCE_DS2_07G_FIXTURE_INITIATIVE_SLUG?.trim() ?? "",
  };

  const fixtureManifest = loadVerificationFixtureManifest();
  if (fixtureManifest?.fixtures) {
    for (const [key, value] of Object.entries(fixtureManifest.fixtures)) {
      if (!dynamicFixtures[key] && value) {
        dynamicFixtures[key] = value;
      }
    }
    if (process.env.SCE_DS2_07G_VERIFICATION_MODE?.trim() === "isolated") {
      verificationEnvironment = {
        mode: "isolated",
        databaseFingerprint: fixtureManifest.databaseFingerprint,
        tenantId: fixtureManifest.tenantId,
        tenantKey: fixtureManifest.tenantKey,
        fixtureManifestVersion: fixtureManifest.version,
        databaseUrlMasked: fixtureManifest.databaseFingerprint
          ? `local/${fixtureManifest.databaseFingerprint.split("/").pop()}`
          : undefined,
      };
    }
  }

  if (Object.values(dynamicFixtures).every(Boolean)) return;

  let databaseUrl = process.env.DATABASE_URL?.trim();
  if (process.env.SCE_DS2_07G_VERIFICATION_MODE?.trim() === "isolated") {
    try {
      databaseUrl = assertSafeVerificationDatabaseUrl();
      verificationEnvironment = {
        ...(verificationEnvironment ?? {}),
        mode: "isolated",
        databaseFingerprint: fingerprintVerificationDatabase(databaseUrl),
        databaseUrlMasked: maskDatabaseUrl(databaseUrl),
      };
    } catch (error) {
      console.warn(
        `[sce-ds2-07g] isolated fixture DB refused: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  }
  if (!databaseUrl) return;

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const tenantId = await resolveVerificationTenantId(client);
    const tenantParams = tenantId ? [tenantId] : [];

    if (!dynamicFixtures.seriesId) {
      const series = await client.query(
        tenantId
          ? `SELECT id FROM "TrainingSeries" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "TrainingSeries" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.seriesId = series.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.sessionId) {
      const session = await client.query(
        tenantId
          ? `SELECT id FROM "TrainingSession" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "TrainingSession" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.sessionId = session.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.eventId) {
      const event = await client.query(
        tenantId
          ? `SELECT id FROM "Event" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "Event" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.eventId = event.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.taskId) {
      const task = await client.query(
        tenantId
          ? `SELECT id FROM "Task" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "Task" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.taskId = task.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.clubId) {
      const club = await client.query(
        tenantId
          ? `SELECT id FROM "ExternalClub" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "ExternalClub" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.clubId = club.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.pageId) {
      const page = await client.query(
        tenantId
          ? `SELECT id FROM "WebsitePage" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "WebsitePage" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.pageId = page.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.componentId) {
      const component = await client.query(
        tenantId
          ? `SELECT id FROM "ReusableComponent" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "ReusableComponent" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.componentId = component.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.roleId) {
      const role = await client.query(
        tenantId
          ? `SELECT id FROM "Role" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "Role" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.roleId = role.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.matchId) {
      const match = await client.query(
        tenantId
          ? `SELECT id FROM "Event" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "Event" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.matchId = match.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.infoboardId) {
      const infoboard = await client.query(
        tenantId
          ? `SELECT id FROM "Infoboard" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "Infoboard" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.infoboardId = infoboard.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.requirementId) {
      const requirement = await client.query(
        tenantId
          ? `SELECT id FROM "Requirement" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "Requirement" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.requirementId = requirement.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.recipientId) {
      const recipient = await client.query(
        tenantId
          ? `SELECT id FROM "RequirementRecipient" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "RequirementRecipient" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.recipientId = recipient.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.scenarioId) {
      const scenario = await client.query(
        tenantId
          ? `SELECT id FROM "FinanceScenario" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`
          : `SELECT id FROM "FinanceScenario" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        tenantParams,
      );
      dynamicFixtures.scenarioId = scenario.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.orgUnitId && tenantId) {
      const orgUnit = await client.query(
        `SELECT id FROM "OrgUnit" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.orgUnitId = orgUnit.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.userId && tenantId && EMAIL) {
      const otherUser = await client.query(
        `SELECT u.id FROM "User" u
         JOIN "TenantMembership" tm ON tm."userId" = u.id
         WHERE tm."tenantId" = $1 AND tm."isActive" = true AND u.email <> $2
         ORDER BY u."updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId, EMAIL],
      );
      dynamicFixtures.userId = otherUser.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.tournamentId && tenantId) {
      const tournament = await client.query(
        `SELECT id FROM "Event" WHERE "tenantId" = $1 AND type = 'TOURNAMENT'
         ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.tournamentId = tournament.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.entityKey) {
      const legalEntity = await client.query(
        `SELECT key FROM "LegalEntity" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.entityKey = legalEntity.rows[0]?.key ?? "";
    }
    if (!dynamicFixtures.tenantSlug && tenantId) {
      const tenant = await client.query(`SELECT key FROM "Tenant" WHERE id = $1 LIMIT 1`, [tenantId]);
      dynamicFixtures.tenantSlug = tenant.rows[0]?.key ?? "";
    }
    if (!dynamicFixtures.registrationId && tenantId) {
      const registration = await client.query(
        `SELECT id FROM "Registration" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.registrationId = registration.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.teamId && tenantId) {
      const team = await client.query(
        `SELECT id FROM "Team" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.teamId = team.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.personId && tenantId) {
      const person = await client.query(
        `SELECT id FROM "Person" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.personId = person.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.teamSeasonId && tenantId) {
      const teamSeason = await client.query(
        `SELECT ts.id FROM "TeamSeason" ts
         JOIN "Team" t ON t.id = ts."teamId"
         WHERE t."tenantId" = $1
         ORDER BY ts."updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.teamSeasonId = teamSeason.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.mappingId && tenantId) {
      const mapping = await client.query(
        `SELECT id FROM "TeamExternalMapping" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.mappingId = mapping.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.targetGroupId && tenantId) {
      const targetGroup = await client.query(
        `SELECT id FROM "TargetGroup" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.targetGroupId = targetGroup.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.communicationId && tenantId) {
      const communication = await client.query(
        `SELECT id FROM "PlatformCommunication" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.communicationId = communication.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.campaignId && tenantId) {
      const campaign = await client.query(
        `SELECT id FROM "PlatformCommunication" WHERE "tenantId" = $1 AND kind = 'CAMPAIGN' ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.campaignId = campaign.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.templateId && tenantId) {
      const template = await client.query(
        `SELECT id FROM "PlatformCommunicationTemplate" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.templateId = template.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.contractKey) {
      const contract = await client.query(
        `SELECT key FROM "BillingContract" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.contractKey = contract.rows[0]?.key ?? "";
    }
    if (!dynamicFixtures.customerKey) {
      const customer = await client.query(
        `SELECT key FROM "BillingCustomer" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.customerKey = customer.rows[0]?.key ?? "";
    }
    if (!dynamicFixtures.invoiceKey) {
      const invoice = await client.query(
        `SELECT key FROM "Invoice" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.invoiceKey = invoice.rows[0]?.key ?? "";
    }
    if (!dynamicFixtures.importKey) {
      const importRow = await client.query(
        `SELECT key FROM "BankReconciliationImport" ORDER BY "uploadedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.importKey = importRow.rows[0]?.key ?? "";
    }
    if (!dynamicFixtures.meetingSlug && tenantId) {
      const meeting = await client.query(
        `SELECT slug FROM "Meeting" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.meetingSlug = meeting.rows[0]?.slug ?? "";
    }
    if (!dynamicFixtures.targetId && tenantId) {
      const target = await client.query(
        `SELECT id FROM "Target" WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
        [tenantId],
      );
      dynamicFixtures.targetId = target.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.governanceTemplateId) {
      const governanceTemplate = await client.query(
        `SELECT id FROM "CommunicationTemplate" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.governanceTemplateId = governanceTemplate.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.adminTenantSlug) {
      const adminTenant = await client.query(`SELECT key FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1`);
      dynamicFixtures.adminTenantSlug = adminTenant.rows[0]?.key ?? dynamicFixtures.tenantSlug;
    }
    if (!dynamicFixtures.adminUserId) {
      const adminUser = await client.query(`SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1`);
      dynamicFixtures.adminUserId = adminUser.rows[0]?.id ?? dynamicFixtures.userId;
    }
  } finally {
    await client.end().catch(() => {});
  }
}

function resolveProbePath(urlPattern) {
  let resolved = urlPattern;
  const fixtureValues = { ...dynamicFixtures };
  if (!fixtureValues.id) {
    if (urlPattern.includes("/website/components/")) fixtureValues.id = dynamicFixtures.componentId;
    else if (urlPattern.includes("/website/pages/")) fixtureValues.id = dynamicFixtures.pageId;
    else if (urlPattern.includes("/vereine/")) fixtureValues.id = dynamicFixtures.clubId;
    else if (urlPattern.includes("/administration/roles/")) fixtureValues.id = dynamicFixtures.roleId;
    else if (urlPattern.includes("/dashboard/roles/")) fixtureValues.id = dynamicFixtures.roleId;
    else if (urlPattern.includes("/org-units/")) fixtureValues.id = dynamicFixtures.orgUnitId;
    else if (urlPattern.includes("/persons/")) fixtureValues.id = dynamicFixtures.personId;
    else if (urlPattern.includes("/dashboard/communication/kampagnen/")) fixtureValues.id = dynamicFixtures.campaignId;
    else if (urlPattern.includes("/dashboard/communication/mitteilungen/")) fixtureValues.id = dynamicFixtures.communicationId;
    else if (urlPattern.includes("/dashboard/communication/vorlagen/")) fixtureValues.id = dynamicFixtures.templateId;
    else if (urlPattern.includes("/dashboard/communication/zielgruppen/")) fixtureValues.id = dynamicFixtures.targetGroupId;
    else if (urlPattern.includes("/dashboard/website/news/")) fixtureValues.id = dynamicFixtures.newsArticleId;
    else if (urlPattern.includes("/vereinsleitung/targets/")) fixtureValues.id = dynamicFixtures.targetId;
    else if (urlPattern.includes("/vereinsleitung/templates/")) fixtureValues.id = dynamicFixtures.governanceTemplateId;
    else if (urlPattern.includes("/dashboard/teams/")) fixtureValues.id = dynamicFixtures.teamId;
    else if (urlPattern.includes("/infoboard/")) fixtureValues.id = dynamicFixtures.infoboardId;
  }
  if (!fixtureValues.slug && urlPattern.includes("/vereinsleitung/meetings/")) {
    fixtureValues.slug = dynamicFixtures.meetingSlug;
  }
  if (!fixtureValues.slug && urlPattern.includes("/vereinsleitung/initiativen/")) {
    fixtureValues.slug = dynamicFixtures.initiativeSlug;
  }
  for (const [key, value] of Object.entries(fixtureValues)) {
    if (!value) continue;
    resolved = resolved.replaceAll(`[${key}]`, encodeURIComponent(value));
  }
  if (/\[[^\]]+\]/.test(resolved)) {
    return null;
  }
  return resolved.replace(/\/+/g, "/").replace(/\/$/, "") || "/dashboard";
}

async function probeKeyboardFocus(page) {
  const focusableCount = await page.evaluate(() =>
    document.querySelectorAll(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ).length,
  );
  if (focusableCount === 0) {
    return [];
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    if (active !== "BODY") {
      return [];
    }
  }
  return ["keyboard focus did not move from body"];
}

async function login(page) {
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`);
  if (!csrfResponse.ok()) {
    throw new Error(`Failed to load Auth.js CSRF token (HTTP ${csrfResponse.status()})`);
  }
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      json: "true",
    },
  });
  if (!loginResponse.ok()) {
    throw new Error(`Credentials login failed (HTTP ${loginResponse.status()})`);
  }
  const payload = await loginResponse.json().catch(() => null);
  if (payload?.error) {
    throw new Error(`Credentials login rejected: ${payload.error}`);
  }
  const dashboard = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (!dashboard || dashboard.status() >= 400) {
    throw new Error(`Authenticated dashboard probe failed (HTTP ${dashboard?.status() ?? "no-response"})`);
  }
  if (page.url().includes("/login")) {
    throw new Error("Session cookie not established after credentials login");
  }
}

async function runAxe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // @ts-expect-error injected axe
    const results = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return {
      violations: results.violations.length,
      incomplete: results.incomplete.length,
      violationSummaries: results.violations.slice(0, 8).map((v) => `${v.id}:${v.impact}`),
      incompleteSummaries: results.incomplete.slice(0, 12).map((v) => `${v.id}:${v.impact ?? "unknown"}`),
    };
  });
}

async function collectLayoutHeuristics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;

    function isWithinContainedScrollRegion(element) {
      let node = element;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const scrollableX =
          style.overflowX === "auto" ||
          style.overflowX === "scroll" ||
          style.overflowX === "hidden" ||
          style.overflowX === "clip";
        if (scrollableX && node.scrollWidth > node.clientWidth + 2) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    let horizontalOverflow = false;
    if (root.scrollWidth > viewportWidth + 2) {
      const wideElements = [...document.body.querySelectorAll("*")].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > viewportWidth + 2 && rect.left < viewportWidth;
      });
      horizontalOverflow = wideElements.some((el) => !isWithinContainedScrollRegion(el));
    }

    const h1Count = document.querySelectorAll("h1").length;
    const duplicateHeader = h1Count > 1;
    const mainLandmarks = document.querySelectorAll(
      "main, [role='main'], [data-sce-workspace-chrome]",
    ).length;
    const navCount = document.querySelectorAll("nav").length;
    return {
      horizontalOverflow,
      duplicateHeader,
      mainLandmarks,
      navCount,
      h1Count,
    };
  });
}

async function collectFunctionalReadOnly(page, urlPattern) {
  const formArchetype = /\/(new|edit|neu)(\/|$)/.test(urlPattern) || urlPattern.includes("[");
  return page.evaluate((needsForm) => {
    const main = document.querySelector("main, [role='main']");
    const hasWorkspaceChromeEquivalent = Boolean(
      document.querySelector("[data-sce-workspace-chrome], [data-testid='sce-workspace-chrome']"),
    );
    const hasPrimaryHeading =
      Boolean(document.querySelector("h1")) ||
      Boolean(document.querySelector("[aria-labelledby]"));
    const interactive = document.querySelectorAll("a[href], button, input, select, textarea").length;
    const hasSubmit = Boolean(
      document.querySelector(
        "button[type='submit'], input[type='submit'], [data-testid*='submit']",
      ) ||
        [...document.querySelectorAll("form button")].some(
          (btn) => btn.getAttribute("type") !== "button",
        ),
    );
    return {
      hasMainLandmark: Boolean(main),
      hasWorkspaceChromeEquivalent,
      hasPrimaryHeading,
      interactiveCount: interactive,
      formCheckSkipped: !needsForm,
      formSubmitPresent: needsForm ? hasSubmit : true,
    };
  }, formArchetype);
}

function mergeEvidenceRow(existing, fresh) {
  if (!existing?.dimensions?.visual?.screenshotReviewed) {
    return fresh;
  }
  const priorVisual = existing.dimensions.visual;
  const nextVisual = fresh.dimensions?.visual;
  if (!nextVisual) return fresh;

  const preservedDetails = (priorVisual.details ?? []).filter(
    (line) => line.startsWith("screenshotReview:") || line.startsWith("finding:"),
  );
  const mergedVisual = {
    ...nextVisual,
    screenshotReviewed: true,
    details: [
      ...(nextVisual.details ?? []).filter(
        (line) => !line.startsWith("screenshotReview:") && !line.startsWith("finding:"),
      ),
      ...preservedDetails,
    ],
  };
  if (priorVisual.status === "PASS" && nextVisual.status !== "FAIL") {
    mergedVisual.status = "PASS";
    mergedVisual.reason = priorVisual.reason ?? nextVisual.reason;
  }
  return {
    ...fresh,
    dimensions: {
      ...fresh.dimensions,
      visual: mergedVisual,
    },
  };
}

async function auditRoute(page, urlPattern, sourceFile, registryEntry) {
  const pageArchetype = inferPageArchetype(sourceFile, Boolean(registryEntry?.intercept));
  const intercept = Boolean(registryEntry?.intercept);
  const probe = resolveProbePath(urlPattern);
  if (!probe) {
    return {
      sourceFile,
      urlPattern,
      desktop: "PENDING",
      compactDesktop: "PENDING",
      tablet: "PENDING",
      mobile: "PENDING",
      accessibility: "PENDING",
      functional: "PENDING",
      authenticatedVisual: "PENDING",
      automated: "PASSED",
      blocked: false,
      dimensions: {
        authentication: { status: "PASS", reason: "Authenticated session established" },
        authorization: { status: "PENDING", reason: "Dynamic fixture unavailable for probe URL" },
        visual: { status: "PENDING", reason: "Missing dynamic fixture id", screenshotReviewed: false, details: [] },
        responsive: {
          status: "PENDING",
          reason: "Missing dynamic fixture id",
          viewports: {},
        },
        accessibility: { status: "PENDING", reason: "Route not probed — missing fixture", axeViolations: 0, axeIncomplete: 0, details: [] },
        functional: { status: "PENDING", reason: "Route not probed — missing fixture", details: [] },
      },
      evidenceReferences: [],
      defects: [
        {
          id: `DS2-07G-fixture-${sourceFile}`,
          introducedByDs2: null,
          status: "OPEN",
          summary: "Missing dynamic fixture for parameterized URL",
          reproduction: urlPattern,
        },
      ],
    };
  }
  const defects = [];
  /** @type {import('./lib/sce-ds2-07g-evidence-contract.mjs').RouteDimensionEvidence['responsive']['viewports']} */
  const viewports = {};
  const evidenceReferences = [];
  let authBlocked = false;
  let axeSummary = { violations: 0, incomplete: 0, violationSummaries: [], incompleteSummaries: [] };
  let desktopKeyboardFailures = [];
  let layoutHeuristics = null;
  let functionalReadOnly = null;

  for (const viewport of VIEWPORTS) {
    const viewportFailures = [];
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    let response = null;
    try {
      response = await page.goto(`${BASE_URL}${probe}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_ABORTED") && !message.includes("Timeout")) {
        throw error;
      }
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }
    const status = response?.status() ?? (page.url().startsWith(BASE_URL) ? 200 : 0);
    await page
      .waitForSelector("[data-sce-workspace-chrome], main[data-sce-page-shell]", {
        timeout: 45_000,
      })
      .catch(() => {});

    if (!response || status >= 400) {
      viewportFailures.push(`HTTP ${status || "no-response"}`);
      if (status === 401 || status === 403) authBlocked = true;
      viewports[viewport.key] = {
        status: status === 401 || status === 403 ? "BLOCKED" : "FAIL",
        reason: viewportFailures.join("; "),
      };
      continue;
    }

    const shot = join(ARTIFACT_DIR, `${probe.replace(/\//g, "_") || "root"}-${viewport.key}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    evidenceReferences.push(shot);

    const hasWorkspaceChrome = await page.locator(
      "[data-sce-workspace-chrome], [data-testid='sce-workspace-chrome']",
    ).count();
    const hasPrimaryNav = await page.locator("nav").count();
    if (hasWorkspaceChrome === 0 && hasPrimaryNav === 0) {
      viewportFailures.push("missing workspace chrome landmarks");
    }

    const keyboardFailures = await probeKeyboardFocus(page);
    if (viewport.key === "desktop") {
      desktopKeyboardFailures = keyboardFailures;
    }
    viewportFailures.push(...keyboardFailures);

    const layout = await collectLayoutHeuristics(page);
    if (layout.horizontalOverflow) {
      viewportFailures.push("horizontal overflow");
    }

    if (viewport.key === "desktop") {
      layoutHeuristics = layout;
      try {
        axeSummary = await runAxe(page);
      } catch (error) {
        viewportFailures.push(`axe-core failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      functionalReadOnly = await collectFunctionalReadOnly(page, urlPattern);
    }

    viewports[viewport.key] = {
      status: viewportFailures.length === 0 ? "PASS" : "FAIL",
      details: viewportFailures,
    };
    for (const failure of viewportFailures) {
      defects.push({
        id: `DS2-07G-${viewport.key}-${defects.length + 1}`,
        introducedByDs2: null,
        status: "OPEN",
        summary: `${viewport.key}: ${failure}`,
        reproduction: `${BASE_URL}${probe}`,
      });
    }
  }

  const responsivePass = VIEWPORT_KEYS.every((k) => viewports[k]?.status === "PASS");
  const visualHeuristicFailures = [];
  if (layoutHeuristics?.duplicateHeader) visualHeuristicFailures.push("multiple h1 elements");
  if (layoutHeuristics && layoutHeuristics.mainLandmarks === 0) {
    visualHeuristicFailures.push("missing main landmark");
  }

  const dimensions = {
    authentication: {
      status: authBlocked ? "BLOCKED" : "PASS",
      reason: authBlocked ? "HTTP 401/403" : "Authenticated navigation succeeded",
    },
    authorization: {
      status: authBlocked ? "BLOCKED" : "PASS",
      reason: "Session could reach route without unauthorized response",
    },
    visual: {
      status:
        visualHeuristicFailures.length > 0
          ? "FAIL"
          : responsivePass
            ? "PENDING"
            : "FAIL",
      reason: responsivePass
        ? "Screenshots captured; automated layout heuristics clean; agent visual review still required for PASS"
        : visualHeuristicFailures.join("; ") || "Responsive probe failed",
      screenshotReviewed: false,
      details: visualHeuristicFailures,
    },
    responsive: {
      status: authBlocked ? "BLOCKED" : responsivePass ? "PASS" : "FAIL",
      viewports,
    },
    accessibility: resolveAccessibilityDimension(
      {
        ...axeSummary,
        keyboardProbeFailures: desktopKeyboardFailures,
      },
      { responsivePass, authBlocked },
    ),
    functional: resolveFunctionalDimension(
      { pageArchetype, urlPattern, intercept },
      functionalReadOnly,
      { authBlocked },
    ),
  };

  const channels = deriveLegacyChannelsFromDimensions(dimensions);

  return {
    sourceFile,
    urlPattern,
    ...channels,
    automated: "PASSED",
    blocked: channels.authenticatedVisual === "BLOCKED",
    dimensions,
    evidenceReferences,
    defects,
  };
}

function selectRoutes(existingBySource) {
  if (MODE === "batch3") {
    return selectBatch3Routes({
      limit: ROUTE_LIMIT,
      offset: ROUTE_OFFSET,
      evidenceBySource: existingBySource,
    });
  }
  if (MODE === "reassess-evidence") {
    const byUrl = new Map(loadRegistryEntries().map((entry) => [entry.sourceFile, entry]));
    const sourceFiles = Object.keys(existingBySource).sort();
    return sourceFiles
      .map((sourceFile) => byUrl.get(sourceFile))
      .filter(Boolean)
      .slice(ROUTE_OFFSET, ROUTE_OFFSET + ROUTE_LIMIT);
  }
  const registry = loadRegistryEntries().filter(
    (entry) =>
      entry.migrationPackage === "DS2-07G" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      (MODE === "high-risk" || isHighRiskRoute(entry.urlPattern)),
  );
  return registry.slice(ROUTE_OFFSET, ROUTE_OFFSET + ROUTE_LIMIT);
}

async function main() {
  await loadDynamicFixtures();
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const existing = loadExistingManifest();
  const existingBySource = existing.bySourceFile ?? {};

  let routes = selectRoutes(existingBySource);
  if (SOURCE_FILE_FILTER?.length) {
  const byUrl = new Map(loadRegistryEntries().map((entry) => [entry.sourceFile, entry]));
    routes = SOURCE_FILE_FILTER.map((sourceFile) => byUrl.get(sourceFile)).filter(Boolean);
  }
  if (routes.length === 0) {
    console.log(JSON.stringify({ message: "No routes selected for mode", mode: MODE }, null, 2));
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);

  const batchResults = {};
  for (const entry of routes) {
    try {
      batchResults[entry.sourceFile] = await auditRoute(page, entry.urlPattern, entry.sourceFile, entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[sce-ds2-07g] route audit failed for ${entry.urlPattern}: ${message}`);
      batchResults[entry.sourceFile] = {
        sourceFile: entry.sourceFile,
        urlPattern: entry.urlPattern,
        desktop: "PENDING",
        compactDesktop: "PENDING",
        tablet: "PENDING",
        mobile: "PENDING",
        accessibility: "PENDING",
        functional: "PENDING",
        authenticatedVisual: "PENDING",
        automated: "PASSED",
        blocked: false,
        dimensions: {
          authentication: { status: "FAIL", reason: message },
          authorization: { status: "PENDING", reason: "Route audit aborted" },
          visual: { status: "FAIL", reason: message, screenshotReviewed: false, details: [] },
          responsive: { status: "FAIL", reason: message, viewports: {} },
          accessibility: { status: "PENDING", reason: "Route audit aborted" },
          functional: { status: "PENDING", reason: "Route audit aborted" },
        },
        evidenceReferences: [],
        defects: [
          {
            id: `DS2-07G-audit-${entry.sourceFile}`,
            introducedByDs2: null,
            status: "OPEN",
            summary: message,
            reproduction: `${BASE_URL}${resolveProbePath(entry.urlPattern)}`,
          },
        ],
      };
    }
  }
  await browser.close();

  const mergedBySource = { ...existingBySource };
  for (const [sourceFile, fresh] of Object.entries(batchResults)) {
    mergedBySource[sourceFile] = mergeEvidenceRow(existingBySource[sourceFile], fresh);
  }
  const highRiskRows = Object.values(mergedBySource).filter((row) => isHighRiskRoute(row.urlPattern));

  const manifest = {
    ...existing,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    verificationEnvironment: verificationEnvironment ?? existing.verificationEnvironment ?? null,
    evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
    batch:
      MODE === "batch3"
        ? `batch-3-module-sampling-offset-${ROUTE_OFFSET}-limit-${ROUTE_LIMIT}`
        : MODE === "reassess-evidence"
          ? `batch-4-reassess-evidence-offset-${ROUTE_OFFSET}-limit-${ROUTE_LIMIT}`
          : `${existing.batch ?? "high-risk-batch-2"}+batch-3-reassess`,
    lastRunMode: MODE,
    prefixes: existing.prefixes,
    dynamicFixtures,
    highRiskRoutesAttempted: highRiskRows.length,
    highRiskRoutesVerified: highRiskRows.filter((row) => row.authenticatedVisual === "VERIFIED").length,
    highRiskRoutesResponsiveVerified: highRiskRows.filter(
      (row) =>
        row.desktop === "VERIFIED" &&
        row.compactDesktop === "VERIFIED" &&
        row.tablet === "VERIFIED" &&
        row.mobile === "VERIFIED",
    ).length,
    batch3RoutesAttemptedThisRun: MODE === "batch3" ? routes.length : 0,
    batch3EvidenceRows: Object.values(mergedBySource).filter((row) => !isHighRiskRoute(row.urlPattern))
      .length,
    bySourceFile: mergedBySource,
  };

  writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
  const rows = buildVerificationMatrix({
    evidenceBySource: mergedBySource,
    authenticatedBrowserAvailable: true,
  });
  const summary = summarizeMatrix(rows, {
    authenticatedBrowserAvailable: true,
    evidenceBySource: mergedBySource,
  });
  console.log(
    JSON.stringify(
      {
        summary,
        mode: MODE,
        routesAttemptedThisRun: routes.length,
        totalEvidenceRows: Object.keys(mergedBySource).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[sce-ds2-07g] verify failed", error);
  process.exit(1);
});
