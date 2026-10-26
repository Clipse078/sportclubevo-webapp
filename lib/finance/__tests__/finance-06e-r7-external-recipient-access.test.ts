/**
 * FIN-06E-R7 — external recipient reachability vs Preview Deployment Protection.
 */

process.env.APP_BASE_URL = "https://fcallschwil.sportclubevo.com";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildFinancePublicationDistributionEmail } from "@/lib/finance/email/build-finance-publication-distribution-email";
import { evaluatePublicActionTarget } from "@/lib/server/public-action-target";
import { FINANCE_06E_PUBLIC_ACTION_TARGET_INVARIANT } from "@/lib/server/finance-publication-share-database-contract";
import { runDeploymentPreflight } from "@/lib/server/deployment-preflight";
import { getDatabaseFingerprintFromEffectivePrismaSource } from "@/lib/server/deployment-identity";

const PREVIEW_HOST = "sportclubevo-webapp-stage-git-curs-46608a.vercel.app";
const CANONICAL = "https://fcallschwil.sportclubevo.com";

const previewEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  APP_ENV: "stage",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  APP_BASE_URL: CANONICAL,
  NEXTAUTH_URL: CANONICAL,
  VERCEL_URL: PREVIEW_HOST,
  DATABASE_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_stage",
  STAGE_DB_URL: "postgresql://u:p@stage-db.neon.tech:5432/sce_stage",
};

const emailLabels = {
  subject: "{tenant} — {year} v{version}",
  greeting: "Guten Tag",
  intro: "{report} {year} v{version} {publishedAt}",
  optionalMessageHeading: "Nachricht",
  viewReportCta: "Bericht ansehen",
  downloadPdfCta: "PDF herunterladen",
  footer: "Gesendet über SportClubEvo für {tenant}",
};

describe("FIN-06E-R7 external recipient access", () => {
  it("documents the public action target invariant", () => {
    expect(FINANCE_06E_PUBLIC_ACTION_TARGET_INVARIANT).toBe(
      "RUNTIME_COMPATIBLE_AND_EXTERNALLY_REACHABLE_AND_CAPABILITY_SECURED",
    );
  });

  it("preflight fails Preview when distribution links require Vercel login", () => {
    const stageUrl = previewEnv.DATABASE_URL!;
    const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource({
      NODE_ENV: "production",
      DATABASE_URL: stageUrl,
    })!;

    const result = runDeploymentPreflight({
      ...previewEnv,
      SCE_DATA_DATABASE_FINGERPRINT: fingerprint,
    });

    expect(result.pass).toBe(false);
    expect(
      result.violations.some((v) => v.code === "PREVIEW_PUBLIC_ACTION_NOT_EXTERNALLY_REACHABLE"),
    ).toBe(true);
  });

  it("preflight passes Preview when operator attests external reachability", () => {
    const stageUrl = previewEnv.DATABASE_URL!;
    const fingerprint = getDatabaseFingerprintFromEffectivePrismaSource({
      NODE_ENV: "production",
      DATABASE_URL: stageUrl,
    })!;

    const result = runDeploymentPreflight({
      ...previewEnv,
      PUBLIC_ACTION_EXTERNALLY_REACHABLE: "confirmed",
      SCE_DATA_DATABASE_FINGERPRINT: fingerprint,
    });

    expect(
      result.violations.some((v) => v.code === "PREVIEW_PUBLIC_ACTION_NOT_EXTERNALLY_REACHABLE"),
    ).toBe(false);
  });

  it("does not embed Vercel bypass parameters in distribution email HTML", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);
    vi.stubEnv("PUBLIC_ACTION_EXTERNALLY_REACHABLE", "confirmed");

    const rendered = buildFinancePublicationDistributionEmail({
      labels: emailLabels,
      tenantName: "FC Allschwil",
      tenantLogoAbsoluteUrl: `${CANONICAL}/images/tenants/fca-crest.png`,
      sceLogoAbsoluteUrl: `${CANONICAL}/images/branding/sportclubevo_logo.png`,
      reportTitle: "Finanzbericht",
      financeYearLabel: "FY 2026",
      versionNumber: 4,
      publishedAtLabel: "26.10.2026",
      senderDisplayName: null,
      optionalMessage: null,
      sharePublicToken: "distribution-capability-token",
      locale: "de",
    });

    expect(rendered.html).not.toContain("x-vercel-protection-bypass");
    expect(rendered.html).not.toContain("VERCEL_AUTOMATION_BYPASS");
    expect(evaluatePublicActionTarget(previewEnv).valid).toBe(false);
    expect(
      evaluatePublicActionTarget({
        ...previewEnv,
        PUBLIC_ACTION_EXTERNALLY_REACHABLE: "confirmed",
      }).valid,
    ).toBe(true);
  });
});
