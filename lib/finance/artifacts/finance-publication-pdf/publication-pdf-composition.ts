import type { FinanceComparativeAttentionInsight } from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";

const HEADLINE_DRIVER_KINDS = new Set(["FAVORABLE_DRIVER", "UNFAVORABLE_DRIVER"]);

/**
 * Driver cards are the canonical executive view. The legacy detail table only
 * repeated those same drivers — render it only when future insight kinds add
 * material beyond headline drivers.
 */
export function publicationPdfShouldRenderMajorDeviationsDetail(
  insights: readonly FinanceComparativeAttentionInsight[],
): boolean {
  return insights.some(
    (insight) =>
      insight.kind !== "OVERALL_RESULT" &&
      insight.kind !== "MISSING_APPROVED_BUDGET" &&
      insight.kind !== "MISSING_CURRENT_FORECAST" &&
      !HEADLINE_DRIVER_KINDS.has(insight.kind),
  );
}

export function buildCompactPublicationInfoLines(input: {
  versionLabel: string;
  publicationVersion: number;
  publishedAtLabel: string;
  publishedAtFormatted: string;
  pdfGeneratedAtLabel: string;
  pdfGeneratedAtFormatted: string;
}): { versionPublishedLine: string; pdfGeneratedLine: string } {
  const versionText = input.versionLabel.replace("{version}", String(input.publicationVersion));
  return {
    versionPublishedLine: `${versionText} · ${input.publishedAtLabel} ${input.publishedAtFormatted}`,
    pdfGeneratedLine: `${input.pdfGeneratedAtLabel} ${input.pdfGeneratedAtFormatted}`,
  };
}

export function buildPublicationPdfFooterLeftLine(input: {
  organisationName: string;
  financialReportHeading: string;
  yearLabel: string;
  publicationVersion: number;
}): string {
  const reportTitle = input.financialReportHeading.replace("{year}", input.yearLabel);
  return `${input.organisationName} · ${reportTitle} · V${input.publicationVersion}`;
}
