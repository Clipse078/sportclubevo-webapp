/**
 * FIN-06E-R6 — Preview distribution emails must link to the same deployment runtime.
 */

process.env.APP_BASE_URL = "https://fcallschwil.sportclubevo.com";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildFinancePublicationDistributionEmail } from "@/lib/finance/email/build-finance-publication-distribution-email";
import { buildPublicActionAbsoluteHref } from "@/lib/server/public-action-base-url";
import { buildNotificationAbsoluteHref } from "@/lib/notifications/internal-href";
import {
  financePublicationSharePath,
  financePublicationSharePdfApiPath,
} from "@/lib/finance/publishing/finance-publication-share-path";
import { FINANCE_06E_CROSS_DEPLOYMENT_PUBLIC_LINK_INVARIANT } from "@/lib/server/finance-publication-share-database-contract";

const PREVIEW_HOST = "sportclubevo-webapp-stage-git-curs-46608a.vercel.app";

const emailLabels = {
  subject: "{tenant} — {year} v{version}",
  greeting: "Guten Tag",
  intro: "{report} {year} v{version} {publishedAt}",
  optionalMessageHeading: "Nachricht",
  viewReportCta: "Bericht ansehen",
  downloadPdfCta: "PDF herunterladen",
  footer: "Gesendet über SportClubEvo für {tenant}",
};

const previewEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  APP_ENV: "stage",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  APP_BASE_URL: "https://fcallschwil.sportclubevo.com",
  VERCEL_URL: PREVIEW_HOST,
};

const stageEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  APP_ENV: "stage",
  VERCEL: "1",
  VERCEL_ENV: "production",
  APP_BASE_URL: "https://fcallschwil.sportclubevo.com",
};

describe("FIN-06E-R6 cross-deployment public link contract", () => {
  it("documents the send/click runtime compatibility invariant", () => {
    expect(FINANCE_06E_CROSS_DEPLOYMENT_PUBLIC_LINK_INVARIANT).toBe(
      "SEND_RUNTIME_COMPATIBLE_WITH_CLICK_RUNTIME",
    );
  });

  it("Preview distribution email uses deployment host for view/PDF, canonical host for branding assets", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("APP_ENV", "stage");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);

    const token = "distribution-capability-token";
    const rendered = buildFinancePublicationDistributionEmail({
      labels: emailLabels,
      tenantName: "FC Allschwil",
      tenantLogoAbsoluteUrl:
        "https://fcallschwil.sportclubevo.com/images/tenants/fca-crest.png",
      sceLogoAbsoluteUrl:
        "https://fcallschwil.sportclubevo.com/images/branding/sportclubevo_logo.png",
      reportTitle: "Finanzbericht",
      financeYearLabel: "FY 2026",
      versionNumber: 4,
      publishedAtLabel: "26.10.2026",
      senderDisplayName: null,
      optionalMessage: null,
      sharePublicToken: token,
      locale: "de",
    });

    const expectedView = buildPublicActionAbsoluteHref(
      financePublicationSharePath(token),
      previewEnv,
    );
    const expectedPdf = buildPublicActionAbsoluteHref(
      financePublicationSharePdfApiPath(token),
      previewEnv,
    );

    expect(expectedView).toContain(PREVIEW_HOST);
    expect(expectedPdf).toContain(PREVIEW_HOST);
    expect(rendered.html).toContain(expectedView);
    expect(rendered.html).toContain(expectedPdf);
    expect(rendered.html).toContain("fcallschwil.sportclubevo.com/images/tenants/fca-crest.png");
    expect(rendered.html).not.toContain(
      "https://fcallschwil.sportclubevo.com/share/finance/publication/",
    );
  });

  it("STAGE production distribution email keeps canonical tenant host for view/PDF", () => {
    vi.stubEnv("APP_BASE_URL", "https://fcallschwil.sportclubevo.com");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("APP_ENV", "stage");

    const token = "distribution-capability-token";
    const rendered = buildFinancePublicationDistributionEmail({
      labels: emailLabels,
      tenantName: "FC Allschwil",
      tenantLogoAbsoluteUrl:
        "https://fcallschwil.sportclubevo.com/images/tenants/fca-crest.png",
      sceLogoAbsoluteUrl:
        "https://fcallschwil.sportclubevo.com/images/branding/sportclubevo_logo.png",
      reportTitle: "Finanzbericht",
      financeYearLabel: "FY 2026",
      versionNumber: 4,
      publishedAtLabel: "26.10.2026",
      senderDisplayName: null,
      optionalMessage: null,
      sharePublicToken: token,
      locale: "de",
    });

    const expectedView = buildPublicActionAbsoluteHref(
      financePublicationSharePath(token),
      stageEnv,
    );
    const expectedPdf = buildPublicActionAbsoluteHref(
      financePublicationSharePdfApiPath(token),
      stageEnv,
    );

    expect(expectedView).toBe(
      "https://fcallschwil.sportclubevo.com/share/finance/publication/distribution-capability-token",
    );
    expect(expectedPdf).toBe(
      "https://fcallschwil.sportclubevo.com/api/share/finance/publication/distribution-capability-token/pdf",
    );
    expect(rendered.html).toContain(expectedView);
    expect(rendered.html).toContain(expectedPdf);
    expect(rendered.html).not.toContain("vercel.app");
  });

  it("does not fall back to notification canonical host on Preview when building public actions", () => {
    const token = "tok-fallback-guard";
    const notificationView = buildNotificationAbsoluteHref(financePublicationSharePath(token));
    const publicView = buildPublicActionAbsoluteHref(
      financePublicationSharePath(token),
      previewEnv,
    );
    expect(notificationView).toContain("fcallschwil.sportclubevo.com");
    expect(publicView).toContain(PREVIEW_HOST);
    expect(publicView).not.toBe(notificationView);
  });
});
