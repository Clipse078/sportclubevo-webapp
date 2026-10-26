import { PDFDocument, type PDFPage, type PDFFont, type RGB } from "pdf-lib";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/billing/invoice-pdf/constants";
import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import { drawRightAlignedText } from "@/lib/billing/invoice-pdf/pdf-text-layout";
import {
  formatManagementPnlMeasureCell,
  formatManagementPnlVarianceDelta,
} from "@/lib/finance/presentation/format-management-pnl-measure";
import { financeVarianceFavorabilityLabelKey } from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import type { SerializedManagementPnlTreeNode } from "@/lib/finance/presentation/serialize-management-pnl-read-model";
import type { FinanceReportingComparisonSlice } from "@/lib/finance/reporting/reporting-comparison-model";
import type { FinanceComparativeAttentionInsight } from "@/lib/finance/reporting/finance-comparative-intelligence-read-model";
import type {
  FinancePublicationPdfDocumentInput,
  FinancePublicationPdfGenerationResult,
  FinancePublicationPdfLabels,
} from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";
import { buildFinancePublicationPdfFilename } from "@/lib/finance/artifacts/finance-publication-pdf/sanitize-finance-publication-pdf-filename";
import { pdfSafeText } from "@/lib/finance/artifacts/finance-publication-pdf/pdf-safe-text";
import {
  formatPublicationPdfTableMeasureCell,
  formatPublicationPdfTableVarianceDelta,
} from "@/lib/finance/artifacts/finance-publication-pdf/format-publication-pdf-table-amount";
import {
  computePublicationPdfHeroLayoutBands,
  publicationPdfHeroHeightPt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-hero-layout";
import {
  drawPublicationImage,
  embedPublicationPdfImage,
  fitImageWithinBounds,
  loadScePublicationMark,
  type PublicationPdfEmbeddedImage,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-images";
import {
  buildCompactPublicationInfoLines,
  buildPublicationPdfFooterLeftLine,
  publicationPdfShouldRenderMajorDeviationsDetail,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-composition";
import {
  computePublicationPdfFooterZones,
  truncateTextToMaxWidth,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-footer-layout";
import { publicationPdfColors } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-colors";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";
import { computePublicationPdfAmountColumnRights } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-table-layout";
import {
  publicationPdfAdvanceYAfterResultBand,
  publicationPdfResultRowGeometryFromBandTop,
  publicationPdfResultRowLayout,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-result-band-layout";
import {
  publicationPdfImmutabilityNoticeMaxWidthPt,
  publicationPdfStatementRowAdvancePt,
  publicationPdfVerticalSpacePt,
} from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-vertical-spacing";

function t(value: string): string {
  return pdfSafeText(value);
}

const PAGE_W = mmToPt(A4_WIDTH_MM);
const PAGE_H = mmToPt(A4_HEIGHT_MM);
const MARGIN_X = mmToPt(18);
const MARGIN_TOP = mmToPt(20);
const MARGIN_BOTTOM = mmToPt(18);
const CONTENT_BOTTOM = MARGIN_BOTTOM + mmToPt(16);
const FOOTER_BLOCK_HEIGHT = mmToPt(11);

const COLORS = publicationPdfColors;

type Fonts = { regular: PDFFont; bold: PDFFont };

type LayoutContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  locale: string;
  labels: FinancePublicationPdfLabels;
  presentation: FinancePublicationPdfDocumentInput["presentation"];
  organisationName: string;
  y: number;
  pageIndex: number;
  totalPages: number;
  footerLeftLine: string;
  tableHeaderDrawnOnPage: boolean;
  tenantLogo: PublicationPdfEmbeddedImage | null;
  sceMark: PublicationPdfEmbeddedImage | null;
  yearLabel: string;
};

function formatDateTime(isoOrDate: string | Date, locale: string): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      date,
    );
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

function extractPublicationYearLabel(financeYearName: string): string {
  const match = financeYearName.match(/\b(20\d{2})\b/);
  return match?.[1] ?? financeYearName.trim();
}

function favorabilityText(
  slice: FinanceReportingComparisonSlice,
  labels: FinancePublicationPdfLabels,
): string | null {
  if (slice.availability !== "AVAILABLE" || slice.favorability === null) return null;
  const key = financeVarianceFavorabilityLabelKey(slice.favorability);
  if (key === "favorabilityFavorable") return labels.favorabilityFavorable;
  if (key === "favorabilityUnfavorable") return labels.favorabilityUnfavorable;
  return labels.favorabilityOnPlan;
}

function columnRights() {
  return computePublicationPdfAmountColumnRights({ pageWidthPt: PAGE_W, marginXPt: MARGIN_X });
}

function drawContinuationHeader(ctx: LayoutContext): void {
  const { page, fonts, labels, presentation, locale, yearLabel } = ctx;
  const identity = presentation.identity;
  let y = PAGE_H - MARGIN_TOP;

  page.drawText(t(ctx.organisationName.toUpperCase()), {
    x: MARGIN_X,
    y,
    size: TYPE.continuationTenant,
    font: fonts.bold,
    color: COLORS.textPrimary,
  });

  const reportLine = `${labels.financialReportHeading.replace("{year}", yearLabel)} · ${labels.reportTypeSubtitle}`;
  y -= mmToPt(5);
  page.drawText(t(reportLine), {
    x: MARGIN_X,
    y,
    size: TYPE.continuationMeta + 0.5,
    font: fonts.regular,
    color: COLORS.textPrimary,
  });

  const officialLine = labels.officialPublicationLine.replace(
    "{version}",
    String(identity.publicationVersion),
  );
  const publishedLine = `${labels.publishedAtLabel}: ${formatDateTime(identity.publishedAt, locale)}`;
  const rightBlock = `${officialLine}\n${publishedLine}`.split("\n");
  let rightY = PAGE_H - MARGIN_TOP;
  for (const line of rightBlock) {
    drawRightAlignedText(page, t(line), PAGE_W - MARGIN_X, rightY, fonts.regular, TYPE.continuationMeta, COLORS.textSecondary);
    rightY -= mmToPt(4);
  }

  const ruleY = PAGE_H - MARGIN_TOP - mmToPt(11);
  page.drawLine({
    start: { x: MARGIN_X, y: ruleY },
    end: { x: PAGE_W - MARGIN_X, y: ruleY },
    thickness: 0.4,
    color: COLORS.rule,
  });

  ctx.y = ruleY - mmToPt(6);
}

function newPage(ctx: LayoutContext): LayoutContext {
  const page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  const next: LayoutContext = {
    ...ctx,
    page,
    y: PAGE_H - MARGIN_TOP,
    pageIndex: ctx.pageIndex + 1,
    tableHeaderDrawnOnPage: false,
  };
  drawContinuationHeader(next);
  return next;
}

function ensureSpace(ctx: LayoutContext, neededPt: number): LayoutContext {
  if (ctx.y - neededPt >= CONTENT_BOTTOM) return ctx;
  return newPage(ctx);
}

function drawFooter(ctx: LayoutContext): void {
  const { page, fonts, labels, pageIndex, totalPages, footerLeftLine, sceMark } = ctx;
  const footerTop = MARGIN_BOTTOM + FOOTER_BLOCK_HEIGHT;
  page.drawLine({
    start: { x: MARGIN_X, y: footerTop },
    end: { x: PAGE_W - MARGIN_X, y: footerTop },
    thickness: 0.4,
    color: COLORS.rule,
  });

  const lineY = footerTop - mmToPt(3.5);
  const zones = computePublicationPdfFooterZones(PAGE_W, MARGIN_X);

  const leftText = t(
    truncateTextToMaxWidth(footerLeftLine, fonts.regular, TYPE.footer, zones.left.maxWidth),
  );
  page.drawText(leftText, {
    x: zones.left.x,
    y: lineY,
    size: TYPE.footer,
    font: fonts.regular,
    color: COLORS.textSecondary,
  });

  const pageText = t(
    labels.pageOfLabel
      .replace("{page}", String(pageIndex))
      .replace("{total}", String(totalPages)),
  );
  const pageTextWidth = fonts.regular.widthOfTextAtSize(pageText, TYPE.footer);
  page.drawText(pageText, {
    x: zones.center.x + (zones.center.maxWidth - pageTextWidth) / 2,
    y: lineY,
    size: TYPE.footer,
    font: fonts.regular,
    color: COLORS.textSecondary,
  });

  const attribution = t(labels.createdWithSportClubEvo);
  const markGap = mmToPt(1.5);
  const markWidth = sceMark?.widthPt ?? 0;
  const attributionWidth = fonts.regular.widthOfTextAtSize(attribution, TYPE.footerAttribution);
  const totalRightWidth = attributionWidth + (markWidth > 0 ? markGap + markWidth : 0);
  const rightX = zones.right.x + zones.right.maxWidth - totalRightWidth;
  page.drawText(attribution, {
    x: rightX,
    y: lineY,
    size: TYPE.footerAttribution,
    font: fonts.regular,
    color: COLORS.textSecondary,
  });
  if (sceMark) {
    drawPublicationImage(page, sceMark, rightX + attributionWidth + markGap, lineY - mmToPt(0.5));
  }
}

function drawWrappedTextBlock(
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  color: RGB,
  lineHeight: number,
): number {
  const words = t(text).split(/\s+/).filter(Boolean);
  let line = "";
  let y = startY;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      page.drawText(t(line), { x, y, size, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(t(line), { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawTableHeader(ctx: LayoutContext): LayoutContext {
  const cols = columnRights();
  const headerY = ctx.y;
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: headerY - mmToPt(5.5),
    width: PAGE_W - MARGIN_X * 2,
    height: mmToPt(6),
    color: COLORS.tableHeaderSurface,
  });
  const size = TYPE.tableHeader;
  const font = ctx.fonts.bold;
  const headerTextY = headerY - mmToPt(3.5);
  ctx.page.drawText(t(ctx.labels.columnPosition), {
    x: MARGIN_X + mmToPt(1),
    y: headerTextY,
    size,
    font,
    color: COLORS.textSecondary,
  });
  drawRightAlignedText(ctx.page, t(ctx.labels.columnBudget), cols.budget, headerTextY, font, size, COLORS.textSecondary);
  drawRightAlignedText(ctx.page, t(ctx.labels.columnActual), cols.actual, headerTextY, font, size, COLORS.textSecondary);
  drawRightAlignedText(ctx.page, t(ctx.labels.columnForecast), cols.forecast, headerTextY, font, size, COLORS.textSecondary);
  drawRightAlignedText(
    ctx.page,
    t(ctx.labels.columnVarianceVsBudget),
    cols.variance,
    headerTextY,
    font,
    size,
    COLORS.textSecondary,
  );
  ctx.y = headerY - mmToPt(7.5);
  ctx.tableHeaderDrawnOnPage = true;
  return ctx;
}

function drawAmountRow(
  ctx: LayoutContext,
  label: string,
  cells: {
    approvedBudget: Parameters<typeof formatPublicationPdfTableMeasureCell>[0];
    actual: Parameters<typeof formatPublicationPdfTableMeasureCell>[0];
    currentForecast: Parameters<typeof formatPublicationPdfTableMeasureCell>[0];
    forecastVsBudget: FinanceReportingComparisonSlice;
  },
  options: {
    bold?: boolean;
    indent?: number;
    emphasis?: boolean;
    /** Omit post-subtotal rule when the terminal Ergebnis row owns the transition. */
    deferClosingRule?: boolean;
  } = {},
): LayoutContext {
  const rowAdvance = publicationPdfStatementRowAdvancePt();
  let next = ensureSpace(ctx, options.emphasis ? publicationPdfResultRowLayout().bandHeightPt + mmToPt(2) : rowAdvance + mmToPt(1.5));
  if (!next.tableHeaderDrawnOnPage) {
    next = drawTableHeader(next);
  }
  const cols = columnRights();
  const currency = next.presentation.pnl.baseCurrency;
  const font = options.bold || options.emphasis ? next.fonts.bold : next.fonts.regular;
  const size = options.emphasis ? TYPE.tableResult : options.bold ? TYPE.tableSubtotal : TYPE.tableRow;
  const indent = options.indent ?? 0;
  const labelX = MARGIN_X + indent;
  const maxLabelWidth = cols.budget - labelX - mmToPt(5);

  let labelY = next.y;
  let resultBandTopY: number | null = null;
  if (options.emphasis) {
    const resultLayout = publicationPdfResultRowLayout();
    resultBandTopY = next.y;
    const geom = publicationPdfResultRowGeometryFromBandTop(resultBandTopY);
    next.page.drawLine({
      start: { x: MARGIN_X, y: geom.separatorY },
      end: { x: PAGE_W - MARGIN_X, y: geom.separatorY },
      thickness: resultLayout.separatorStrokePt,
      color: COLORS.ruleStrong,
    });
    next.page.drawRectangle({
      x: MARGIN_X,
      y: geom.bandBottomY,
      width: PAGE_W - MARGIN_X * 2,
      height: geom.surfaceHeightPt,
      color: COLORS.resultSurface,
    });
    labelY = geom.baselineY;
  }

  const labelEndY = drawWrappedTextBlock(
    next.page,
    label,
    labelX,
    labelY,
    maxLabelWidth,
    size,
    font,
    COLORS.textPrimary,
    mmToPt(4),
  );
  const rowY = labelY;

  const values = [
    formatPublicationPdfTableMeasureCell(cells.approvedBudget, currency, next.locale),
    formatPublicationPdfTableMeasureCell(cells.actual, currency, next.locale),
    formatPublicationPdfTableMeasureCell(cells.currentForecast, currency, next.locale),
    formatPublicationPdfTableVarianceDelta(cells.forecastVsBudget, currency, next.locale),
  ];
  const xs = [cols.budget, cols.actual, cols.forecast, cols.variance];
  for (let i = 0; i < values.length; i += 1) {
    drawRightAlignedText(next.page, t(values[i]!), xs[i]!, rowY, font, size, COLORS.textPrimary);
  }

  if (options.emphasis && resultBandTopY !== null) {
    next.y = publicationPdfAdvanceYAfterResultBand(resultBandTopY);
  } else {
    next.y = Math.min(next.y - rowAdvance, labelEndY - mmToPt(1));
  }
  if (options.bold && !options.emphasis && !options.deferClosingRule) {
    next.page.drawLine({
      start: { x: MARGIN_X, y: next.y + mmToPt(1.5) },
      end: { x: PAGE_W - MARGIN_X, y: next.y + mmToPt(1.5) },
      thickness: 0.35,
      color: COLORS.rule,
    });
  }
  return next;
}

function walkTree(ctx: LayoutContext, nodes: readonly SerializedManagementPnlTreeNode[], depth: number): LayoutContext {
  let next = ctx;
  for (const node of nodes) {
    if (node.kind === "reporting_group") {
      if (depth > 0) {
        next = drawAmountRow(next, node.name, node, { indent: depth * mmToPt(3) });
      }
      next = walkTree(next, node.children, depth + 1);
    } else if (node.kind === "account") {
      next = drawAmountRow(next, node.name, node, { indent: (depth + 1) * mmToPt(3) });
    } else if (node.kind === "unassigned_residual") {
      next = drawAmountRow(next, next.labels.unassignedGroup, node, {
        bold: true,
        indent: depth * mmToPt(3),
      });
      for (const account of node.accounts) {
        next = drawAmountRow(next, account.name, account, {
          indent: (depth + 2) * mmToPt(3),
        });
      }
    }
  }
  return next;
}

function drawPublicationMasthead(ctx: LayoutContext, input: FinancePublicationPdfDocumentInput): LayoutContext {
  const { presentation, fonts, labels, locale, tenantLogo } = ctx;
  const identity = presentation.identity;
  let y = ctx.y;

  if (tenantLogo) {
    const logoX = PAGE_W - MARGIN_X - tenantLogo.widthPt;
    const logoY = y - tenantLogo.heightPt + mmToPt(2);
    drawPublicationImage(ctx.page, tenantLogo, logoX, logoY);
  }

  ctx.page.drawText(t(input.organisationName.toUpperCase()), {
    x: MARGIN_X,
    y,
    size: TYPE.mastheadTenant,
    font: fonts.bold,
    color: COLORS.textPrimary,
  });
  y -= mmToPt(8);

  const reportHeading = labels.financialReportHeading.replace("{year}", ctx.yearLabel);
  ctx.page.drawText(t(reportHeading), {
    x: MARGIN_X,
    y,
    size: TYPE.reportTitle,
    font: fonts.bold,
    color: COLORS.sectionAccent,
  });
  y -= mmToPt(5);

  ctx.page.drawText(t(labels.reportTypeSubtitle), {
    x: MARGIN_X,
    y,
    size: TYPE.reportSubtitle,
    font: fonts.regular,
    color: COLORS.textPrimary,
  });
  y -= mmToPt(6);

  const officialLine = labels.officialPublicationLine.replace(
    "{version}",
    String(identity.publicationVersion),
  );
  ctx.page.drawText(t(officialLine), {
    x: MARGIN_X,
    y,
    size: TYPE.publicationMetadata,
    font: fonts.bold,
    color: COLORS.textSecondary,
  });
  y -= mmToPt(4);

  ctx.page.drawText(
    t(`${labels.publishedAtLabel}: ${formatDateTime(identity.publishedAt, locale)}`),
    { x: MARGIN_X, y, size: TYPE.publicationMetadata, font: fonts.regular, color: COLORS.textSecondary },
  );

  ctx.y = y - mmToPt(8);
  return ctx;
}

function drawHeroFinancialConclusion(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const pnl = presentation.pnl;
  const currency = pnl.baseCurrency;
  const forecast = pnl.managementResult.currentForecast;
  const budget = pnl.managementResult.approvedBudget;
  const actual = pnl.managementResult.actual;
  const variance = pnl.interpretation.forecastVsBudgetManagementResult;

  const heroTop = ctx.y;
  const heroHeight = publicationPdfHeroHeightPt();
  const bands = computePublicationPdfHeroLayoutBands(heroTop);

  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: heroTop - heroHeight,
    width: PAGE_W - MARGIN_X * 2,
    height: heroHeight,
    color: COLORS.heroSurface,
  });

  const innerX = MARGIN_X + mmToPt(5);
  const innerWidth = PAGE_W - MARGIN_X * 2 - mmToPt(10);

  ctx.page.drawText(t(labels.expectedResultLabel.toUpperCase()), {
    x: innerX,
    y: bands.label.yBottom + mmToPt(1.5),
    size: TYPE.heroEyebrow,
    font: fonts.bold,
    color: COLORS.textSecondary,
  });

  const forecastValue = formatManagementPnlMeasureCell(forecast, currency, locale);
  ctx.page.drawText(t(forecastValue), {
    x: innerX,
    y: bands.value.yBottom + mmToPt(2),
    size: TYPE.heroNumber,
    font: fonts.bold,
    color: COLORS.textPrimary,
  });

  const varianceValue = formatManagementPnlVarianceDelta(variance, currency, locale);
  const favText = favorabilityText(variance, labels);
  const varianceLine = favText
    ? `${varianceValue} ${labels.varianceVsBudgetLabel} · ${favText}`
    : `${varianceValue} ${labels.varianceVsBudgetLabel}`;
  const varianceColor =
    variance.favorability === "FAVORABLE"
      ? COLORS.favorableText
      : variance.favorability === "UNFAVORABLE"
        ? COLORS.unfavorableText
        : COLORS.textPrimary;
  const bandColor =
    variance.favorability === "FAVORABLE"
      ? COLORS.favorableHeroBand
      : variance.favorability === "UNFAVORABLE"
        ? COLORS.unfavorableHeroBand
        : COLORS.page;
  ctx.page.drawRectangle({
    x: innerX,
    y: bands.variance.yBottom + mmToPt(0.5),
    width: innerWidth,
    height: bands.variance.yTop - bands.variance.yBottom - mmToPt(0.5),
    color: bandColor,
  });
  ctx.page.drawText(t(varianceLine), {
    x: innerX + mmToPt(2),
    y: bands.variance.yBottom + mmToPt(2),
    size: TYPE.heroVariance,
    font: fonts.regular,
    color: varianceColor,
  });

  const supportCols = [
    { label: labels.budgetResultLabel, value: formatManagementPnlMeasureCell(budget, currency, locale) },
    { label: labels.actualResultLabel, value: formatManagementPnlMeasureCell(actual, currency, locale) },
  ];
  const colWidth = innerWidth / 2;
  for (let i = 0; i < supportCols.length; i += 1) {
    const col = supportCols[i]!;
    const x = innerX + i * colWidth;
    ctx.page.drawText(t(col.label), {
      x,
      y: bands.supporting.yTop - mmToPt(3),
      size: TYPE.supportingMetricLabel,
      font: fonts.regular,
      color: COLORS.textSecondary,
    });
    ctx.page.drawText(t(col.value), {
      x,
      y: bands.supporting.yBottom + mmToPt(1),
      size: TYPE.supportingMetricValue,
      font: fonts.regular,
      color: COLORS.textSecondary,
    });
  }

  ctx.y = heroTop - heroHeight - mmToPt(5);
  return ctx;
}

function formatAttentionDetail(
  insight: Extract<FinanceComparativeAttentionInsight, { kind: "OVERALL_RESULT" }>,
  labels: FinancePublicationPdfLabels,
  currency: string | null,
  locale: string,
): { title: string; detail: string | null } {
  const amount = formatManagementPnlVarianceDelta(
    {
      availability: "AVAILABLE",
      baselineMinor: null,
      comparisonMinor: null,
      rawDeltaMinor: insight.rawDeltaMinor,
      variancePercent: null,
      favorability: insight.favorability,
      absoluteVarianceMagnitudeMinor: insight.rawDeltaMinor !== null ? Math.abs(insight.rawDeltaMinor) : null,
    },
    currency,
    locale,
  );
  if (insight.favorability === "FAVORABLE") {
    return {
      title: labels.attentionResultFavorableTitle,
      detail: labels.attentionResultFavorableDetail.replace("{amount}", amount),
    };
  }
  if (insight.favorability === "UNFAVORABLE") {
    return {
      title: labels.attentionResultUnfavorableTitle,
      detail: labels.attentionResultUnfavorableDetail.replace("{amount}", amount),
    };
  }
  return { title: labels.attentionResultOnPlanTitle, detail: null };
}

function drawManagementAssessment(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const insights = presentation.pnl.comparativeIntelligence.attentionInsights;
  const currency = presentation.pnl.baseCurrency;

  ctx.page.drawText(t(labels.managementAssessmentTitle), {
    x: MARGIN_X,
    y: ctx.y,
    size: TYPE.sectionHeading,
    font: fonts.bold,
    color: COLORS.sectionAccent,
  });
  ctx.y -= mmToPt(5);

  const overall = insights.find((i) => i.kind === "OVERALL_RESULT");
  if (overall && overall.kind === "OVERALL_RESULT") {
    const { title, detail } = formatAttentionDetail(overall, labels, currency, locale);
    const blockTop = ctx.y;
    const accentX = MARGIN_X;
    const textX = MARGIN_X + mmToPt(3.5);
    const accentColor =
      overall.favorability === "FAVORABLE"
        ? COLORS.managementAccent
        : overall.favorability === "UNFAVORABLE"
          ? COLORS.unfavorableText
          : COLORS.sectionAccent;
    const accentHeight = mmToPt(detail ? 12 : 7);
    ctx.page.drawLine({
      start: { x: accentX, y: blockTop },
      end: { x: accentX, y: blockTop - accentHeight },
      thickness: 1.2,
      color: accentColor,
    });
    ctx.page.drawText(t(title), {
      x: textX,
      y: blockTop - mmToPt(4),
      size: TYPE.body,
      font: fonts.bold,
      color: COLORS.textPrimary,
    });
    if (detail) {
      ctx.y = drawWrappedTextBlock(
        ctx.page,
        detail,
        textX,
        blockTop - mmToPt(8),
        PAGE_W - textX - MARGIN_X,
        TYPE.body,
        fonts.regular,
        COLORS.textPrimary,
        mmToPt(4.2),
      );
    } else {
      ctx.y = blockTop - accentHeight;
    }
    ctx.y -= mmToPt(3);
  }

  return ctx;
}

function drawVarianceDrivers(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const insights = presentation.pnl.comparativeIntelligence.attentionInsights;
  const currency = presentation.pnl.baseCurrency;

  const fav = insights.find((i) => i.kind === "FAVORABLE_DRIVER");
  const unfav = insights.find((i) => i.kind === "UNFAVORABLE_DRIVER");
  if (!fav && !unfav) {
    return ctx;
  }

  const cardWidth = (PAGE_W - MARGIN_X * 2 - mmToPt(4)) / 2;
  const cardHeight = mmToPt(16);
  const cardTop = ctx.y;
  const cards: Array<{
    x: number;
    bg: RGB;
    title: string;
    name: string;
    amountLine: string;
    amountColor: RGB;
  }> = [];

  if (fav && fav.kind === "FAVORABLE_DRIVER") {
    const delta = formatManagementPnlVarianceDelta(fav.driver.comparison, currency, locale);
    cards.push({
      x: MARGIN_X,
      bg: COLORS.favorableSurface,
      title: labels.positiveDriverTitle,
      name: fav.driver.name,
      amountLine: delta,
      amountColor: COLORS.favorableText,
    });
  }
  if (unfav && unfav.kind === "UNFAVORABLE_DRIVER") {
    const delta = formatManagementPnlVarianceDelta(unfav.driver.comparison, currency, locale);
    const suffix =
      unfav.driver.canonicalSemantic === "EXPENSE" ? ` ${labels.attentionDriverExpenseSuffix}` : "";
    cards.push({
      x: MARGIN_X + (fav ? cardWidth + mmToPt(4) : 0),
      bg: COLORS.unfavorableSurface,
      title: labels.negativeDriverTitle,
      name: unfav.driver.name,
      amountLine: `${delta}${suffix}`,
      amountColor: COLORS.unfavorableText,
    });
  }

  for (const card of cards) {
    ctx.page.drawRectangle({
      x: card.x,
      y: cardTop - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: card.bg,
    });
    ctx.page.drawText(t(card.title), {
      x: card.x + mmToPt(3),
      y: cardTop - mmToPt(5),
      size: TYPE.driverLabel,
      font: fonts.regular,
      color: COLORS.textSecondary,
    });
    ctx.page.drawText(t(card.name), {
      x: card.x + mmToPt(3),
      y: cardTop - mmToPt(9),
      size: TYPE.driverName,
      font: fonts.bold,
      color: COLORS.textPrimary,
    });
    ctx.page.drawText(t(card.amountLine), {
      x: card.x + mmToPt(3),
      y: cardTop - mmToPt(13),
      size: TYPE.driverAmount,
      font: fonts.bold,
      color: card.amountColor,
    });
  }

  ctx.y = cardTop - cardHeight - mmToPt(5);
  return ctx;
}

function drawStatementHeading(ctx: LayoutContext): LayoutContext {
  const { labels, fonts, presentation } = ctx;
  const currency = presentation.pnl.baseCurrency;

  ctx.page.drawText(t(labels.statementSectionTitle), {
    x: MARGIN_X,
    y: ctx.y,
    size: TYPE.sectionHeading,
    font: fonts.bold,
    color: COLORS.sectionAccent,
  });
  ctx.y -= publicationPdfVerticalSpacePt("xs");
  ctx.page.drawText(
    t(labels.amountsInCurrencyLabel.replace("{currency}", currency ?? "")),
    { x: MARGIN_X, y: ctx.y, size: TYPE.supportingMetricLabel, font: fonts.regular, color: COLORS.textSecondary },
  );
  ctx.y -= publicationPdfVerticalSpacePt("md");
  return ctx;
}

function drawIncomeSection(ctx: LayoutContext): LayoutContext {
  let next = ctx;
  next.page.drawText(t(next.labels.incomeSection.toUpperCase()), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.body,
    font: next.fonts.bold,
    color: COLORS.textPrimary,
  });
  next.y -= publicationPdfVerticalSpacePt("sm");
  next = drawTableHeader({ ...next, tableHeaderDrawnOnPage: false });
  next = walkTree(next, next.presentation.pnl.incomeSection.nodes, 0);
  next = drawAmountRow(next, next.labels.incomeSectionTotal, next.presentation.pnl.incomeSection.sectionTotal, {
    bold: true,
  });
  next.y -= publicationPdfVerticalSpacePt("sm");
  return next;
}

function drawExpenseSectionAndResult(ctx: LayoutContext): LayoutContext {
  let next = ensureSpace(ctx, mmToPt(24));
  next.page.drawText(t(next.labels.expenseSection.toUpperCase()), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.body,
    font: next.fonts.bold,
    color: COLORS.textPrimary,
  });
  next.y -= publicationPdfVerticalSpacePt("sm");
  next = drawTableHeader({ ...next, tableHeaderDrawnOnPage: false });
  next = walkTree(next, next.presentation.pnl.expenseSection.nodes, 0);
  next = drawAmountRow(next, next.labels.expenseSectionTotal, next.presentation.pnl.expenseSection.sectionTotal, {
    bold: true,
    deferClosingRule: true,
  });
  next = ensureSpace(next, publicationPdfResultRowLayout().bandHeightPt);
  next = drawAmountRow(next, next.labels.managementResult, next.presentation.pnl.managementResult, {
    emphasis: true,
  });
  return next;
}

function drawMajorDeviations(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const insights = presentation.pnl.comparativeIntelligence.attentionInsights;
  const currency = presentation.pnl.baseCurrency;
  const fav = insights.find((i) => i.kind === "FAVORABLE_DRIVER");
  const unfav = insights.find((i) => i.kind === "UNFAVORABLE_DRIVER");
  if (!fav && !unfav) return ctx;

  let next = ensureSpace(ctx, mmToPt(22));
  next.page.drawText(t(labels.majorDeviationsTitle), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.sectionHeading,
    font: fonts.bold,
    color: COLORS.sectionAccent,
  });
  next.y -= mmToPt(6);

  const rows: Array<{ name: string; delta: string; comment: string }> = [];
  if (fav && fav.kind === "FAVORABLE_DRIVER") {
    rows.push({
      name: fav.driver.name,
      delta: formatManagementPnlVarianceDelta(fav.driver.comparison, currency, locale),
      comment: labels.deviationCommentFavorable,
    });
  }
  if (unfav && unfav.kind === "UNFAVORABLE_DRIVER") {
    rows.push({
      name: unfav.driver.name,
      delta: formatManagementPnlVarianceDelta(unfav.driver.comparison, currency, locale),
      comment: labels.deviationCommentUnfavorable,
    });
  }

  const colDeviation = MARGIN_X + mmToPt(52);
  const colComment = MARGIN_X + mmToPt(82);
  next.page.drawText(t(labels.columnPosition), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.tableHeader,
    font: fonts.bold,
    color: COLORS.textSecondary,
  });
  next.page.drawText(t(labels.columnDeviation), {
    x: colDeviation,
    y: next.y,
    size: TYPE.tableHeader,
    font: fonts.bold,
    color: COLORS.textSecondary,
  });
  next.page.drawText(t(labels.columnComment), {
    x: colComment,
    y: next.y,
    size: TYPE.tableHeader,
    font: fonts.bold,
    color: COLORS.textSecondary,
  });
  next.y -= mmToPt(5);

  for (const row of rows) {
    next = ensureSpace(next, mmToPt(6));
    next.page.drawText(t(row.name), {
      x: MARGIN_X,
      y: next.y,
      size: TYPE.body,
      font: fonts.regular,
      color: COLORS.textPrimary,
    });
    next.page.drawText(t(row.delta), {
      x: colDeviation,
      y: next.y,
      size: TYPE.body,
      font: fonts.regular,
      color: COLORS.textPrimary,
    });
    next.y = drawWrappedTextBlock(
      next.page,
      row.comment,
      colComment,
      next.y,
      PAGE_W - colComment - MARGIN_X,
      TYPE.body,
      fonts.regular,
      COLORS.textSecondary,
      mmToPt(4),
    );
    next.y -= mmToPt(1);
  }

  next.y -= mmToPt(3);
  return next;
}

function drawPublicationMetadata(ctx: LayoutContext, input: FinancePublicationPdfDocumentInput): LayoutContext {
  const identity = input.presentation.identity;
  const next = ensureSpace(ctx, publicationPdfVerticalSpacePt("xl") + mmToPt(6));

  next.page.drawText(t(next.labels.publicationInfoTitle), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.evidenceSectionHeading,
    font: next.fonts.bold,
    color: COLORS.textSecondary,
  });
  next.y -= publicationPdfVerticalSpacePt("sm");

  const compact = buildCompactPublicationInfoLines({
    versionLabel: next.labels.versionLabel,
    publicationVersion: identity.publicationVersion,
    publishedAtLabel: next.labels.publishedAtLabel,
    publishedAtFormatted: formatDateTime(identity.publishedAt, next.locale),
    pdfGeneratedAtLabel: next.labels.pdfGeneratedAtLabel,
    pdfGeneratedAtFormatted: formatDateTime(input.generatedAt, next.locale),
  });

  next.page.drawText(t(compact.versionPublishedLine), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.publicationNote,
    font: next.fonts.regular,
    color: COLORS.textPrimary,
  });
  next.y -= publicationPdfVerticalSpacePt("xs");
  next.page.drawText(t(compact.pdfGeneratedLine), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.publicationNote,
    font: next.fonts.regular,
    color: COLORS.textSecondary,
  });
  next.y -= publicationPdfVerticalSpacePt("2xs");
  return next;
}

function drawPublicationSnapshotNotice(ctx: LayoutContext): LayoutContext {
  const next = ensureSpace(ctx, mmToPt(14));
  next.y = drawWrappedTextBlock(
    next.page,
    next.labels.snapshotImmutabilityNotice,
    MARGIN_X,
    next.y,
    publicationPdfImmutabilityNoticeMaxWidthPt(),
    TYPE.publicationNote,
    next.fonts.regular,
    COLORS.textSecondary,
    mmToPt(4),
  );
  next.y -= mmToPt(2);
  return next;
}

export async function generateFinancePublicationPdf(
  input: FinancePublicationPdfDocumentInput,
): Promise<FinancePublicationPdfGenerationResult> {
  const pdfDoc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdfDoc.embedFont("Helvetica"),
    bold: await pdfDoc.embedFont("Helvetica-Bold"),
  };

  const identity = input.presentation.identity;
  const yearLabel = extractPublicationYearLabel(identity.financeYearName);
  const metaTitle = `${input.organisationName} – ${input.labels.financialReportHeading.replace("{year}", yearLabel)} – Version ${identity.publicationVersion}`;
  pdfDoc.setTitle(metaTitle);
  pdfDoc.setSubject(input.labels.reportTypeSubtitle);
  pdfDoc.setAuthor(input.organisationName);
  pdfDoc.setCreator("SportClubEvo");
  pdfDoc.setProducer("SportClubEvo");
  pdfDoc.setLanguage(input.documentLanguage);
  pdfDoc.setCreationDate(input.generatedAt);
  pdfDoc.setModificationDate(input.generatedAt);

  let tenantLogo: PublicationPdfEmbeddedImage | null = null;
  if (input.organisationLogoBytes && input.organisationLogoMime) {
    const embedded = await embedPublicationPdfImage(
      pdfDoc,
      input.organisationLogoBytes,
      input.organisationLogoMime,
    );
    if (embedded) {
      const fitted = fitImageWithinBounds(embedded.width, embedded.height, mmToPt(22), mmToPt(18));
      tenantLogo = { image: embedded, widthPt: fitted.widthPt, heightPt: fitted.heightPt };
    }
  }

  const sceMark = await loadScePublicationMark(pdfDoc, mmToPt(16), mmToPt(4.5));

  const footerLeftLine = buildPublicationPdfFooterLeftLine({
    organisationName: input.organisationName,
    financialReportHeading: input.labels.financialReportHeading,
    yearLabel,
    publicationVersion: identity.publicationVersion,
  });

  const firstPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let ctx: LayoutContext = {
    pdfDoc,
    page: firstPage,
    fonts,
    locale: input.formattingLocale,
    labels: input.labels,
    presentation: input.presentation,
    organisationName: input.organisationName,
    y: PAGE_H - MARGIN_TOP,
    pageIndex: 1,
    totalPages: 1,
    footerLeftLine,
    tableHeaderDrawnOnPage: false,
    tenantLogo,
    sceMark,
    yearLabel,
  };

  const attentionInsights = input.presentation.pnl.comparativeIntelligence.attentionInsights;

  ctx = drawPublicationMasthead(ctx, input);
  ctx = drawHeroFinancialConclusion(ctx);
  ctx = ensureSpace(ctx, mmToPt(30));
  ctx = drawManagementAssessment(ctx);
  ctx = ensureSpace(ctx, mmToPt(20));
  ctx = drawVarianceDrivers(ctx);
  ctx = ensureSpace(ctx, mmToPt(26));
  ctx = drawStatementHeading(ctx);
  ctx = drawIncomeSection(ctx);
  ctx = drawExpenseSectionAndResult(ctx);
  if (publicationPdfShouldRenderMajorDeviationsDetail(attentionInsights)) {
    ctx = drawMajorDeviations(ctx);
  }
  ctx = drawPublicationMetadata(ctx, input);
  ctx = drawPublicationSnapshotNotice(ctx);

  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i += 1) {
    drawFooter({
      ...ctx,
      page: pdfDoc.getPage(i),
      pageIndex: i + 1,
      totalPages,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filename = buildFinancePublicationPdfFilename({
    organisationName: input.organisationName,
    reportTitle: identity.title,
    financeYearLabel: identity.financeYearName,
    versionNumber: identity.publicationVersion,
  });

  return {
    pdfBytes,
    pageCount: totalPages,
    filename,
  };
}
