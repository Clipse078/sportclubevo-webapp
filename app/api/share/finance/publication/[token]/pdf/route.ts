import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/prisma";
import { financePublicationPdfContentDisposition } from "@/lib/finance/artifacts/finance-publication-pdf/sanitize-finance-publication-pdf-filename";
import { buildFinancePublicationPdfLabels } from "@/lib/finance/presentation/load-finance-publication-pdf-labels";
import { generateFinancePublicationPdfArtifactForShare } from "@/lib/finance/services/finance-publication-artifact-service";
import { resolveFinancePublicationShareByRawToken } from "@/lib/finance/services/finance-publication-share-service";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { createRateLimitResponse } from "@/lib/security/rate-limit-response";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const ip = getClientIp(request);
  const limited = checkRateLimit(`finance-publication-share-pdf:${ip}`, 30, 15 * 60 * 1000);
  if (!limited.allowed) {
    return createRateLimitResponse(limited.retryAfterMs);
  }

  const { token } = await context.params;
  const resolved = await resolveFinancePublicationShareByRawToken(prisma, token, {
    recordAccess: true,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  }

  const overview = await getTranslations("Finance.overview");
  const pub = await getTranslations("Finance.reporting.publication");
  const pnl = await getTranslations("Finance.reporting.pnl");
  const actuals = await getTranslations("Finance.actuals");
  const labels = buildFinancePublicationPdfLabels({
    overview: (key) => overview(key),
    publication: (key, values) => pub(key, values),
    pnl: (key, values) => pnl(key, values),
    actuals: (key) => actuals(key),
  });

  const result = await generateFinancePublicationPdfArtifactForShare({
    tenantId: resolved.tenantId,
    snapshot: resolved.snapshot,
    lifecycleStatus: resolved.lifecycleStatus,
    reportTypeContentLabel: pub("pdfReportTypeSubtitle"),
    labels,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(result.pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": financePublicationPdfContentDisposition(result.filename),
      "Cache-Control": "private, no-store",
      "X-Finance-Publication-Version": String(resolved.versionNumber),
    },
  });
}
