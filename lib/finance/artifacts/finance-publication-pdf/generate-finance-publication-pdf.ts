import { PDFDocument, type PDFPage, rgb, type PDFFont, type RGB } from "pdf-lib";
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

function t(value: string): string {
  return pdfSafeText(value);
}

const PAGE_W = mmToPt(A4_WIDTH_MM);
const PAGE_H = mmToPt(A4_HEIGHT_MM);
const MARGIN_X = mmToPt(18);
const MARGIN_TOP = mmToPt(20);
const MARGIN_BOTTOM = mmToPt(18);
const CONTENT_BOTTOM = MARGIN_BOTTOM + mmToPt(14);

/** Typography scale (pt) — Helvetica / Helvetica-Bold only (pdf-lib standard fonts, WinAnsi). */
const TYPE = {
  mastheadClub: 15,
  mastheadReport: 11,
  mastheadSubtitle: 10,
  mastheadMeta: 8.5,
  sectionHeading: 10,
  heroValue: 22,
  heroLabel: 8,
  heroVariance: 10,
  heroSupporting: 8.5,
  body: 9,
  tableHeader: 7.5,
  tableRow: 8.5,
  tableRowBold: 9,
  metadata: 8,
  footer: 7,
  attribution: 6.5,
} as const;

const COLORS = {
  text: rgb(0.09, 0.11, 0.15),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.82, 0.84, 0.87),
  accent: rgb(0.07, 0.17, 0.29),
  heroBg: rgb(0.97, 0.98, 0.99),
  favorable: rgb(0.12, 0.42, 0.28),
  unfavorable: rgb(0.55, 0.18, 0.16),
} as const;

type Fonts = { regular: PDFFont; bold: PDFFont };

type LayoutContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  locale: string;
  labels: FinancePublicationPdfLabels;
  presentation: FinancePublicationPdfDocumentInput["presentation"];
  y: number;
  pageIndex: number;
  totalPages: number;
  footerLeft: string;
  tableHeaderDrawnOnPage: boolean;
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

function columnRights(): { budget: number; actual: number; forecast: number; variance: number } {
  const right = PAGE_W - MARGIN_X;
  return {
    budget: right - mmToPt(84),
    actual: right - mmToPt(60),
    forecast: right - mmToPt(36),
    variance: right,
  };
}

function newPage(ctx: LayoutContext): LayoutContext {
  const page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  return {
    ...ctx,
    page,
    y: PAGE_H - MARGIN_TOP,
    pageIndex: ctx.pageIndex + 1,
    tableHeaderDrawnOnPage: false,
  };
}

function ensureSpace(ctx: LayoutContext, neededPt: number): LayoutContext {
  if (ctx.y - neededPt >= CONTENT_BOTTOM) return ctx;
  return newPage(ctx);
}

function drawFooter(ctx: LayoutContext): void {
  const { page, fonts, labels, pageIndex, totalPages, footerLeft } = ctx;
  const footerY = MARGIN_BOTTOM - mmToPt(1);
  page.drawLine({
    start: { x: MARGIN_X, y: footerY + mmToPt(4) },
    end: { x: PAGE_W - MARGIN_X, y: footerY + mmToPt(4) },
    thickness: 0.4,
    color: COLORS.line,
  });
  page.drawText(t(footerLeft), {
    x: MARGIN_X,
    y: footerY,
    size: TYPE.footer,
    font: fonts.regular,
    color: COLORS.muted,
  });
  const pageText = t(
    labels.pageOfLabel
      .replace("{page}", String(pageIndex))
      .replace("{total}", String(totalPages)),
  );
  drawRightAlignedText(
    page,
    pageText,
    PAGE_W - MARGIN_X,
    footerY,
    fonts.regular,
    TYPE.footer,
    COLORS.muted,
  );
  page.drawText(t(labels.createdWithSportClubEvo), {
    x: MARGIN_X,
    y: footerY - mmToPt(3.5),
    size: TYPE.attribution,
    font: fonts.regular,
    color: COLORS.muted,
  });
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
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: headerY + mmToPt(1) },
    end: { x: PAGE_W - MARGIN_X, y: headerY + mmToPt(1) },
    thickness: 0.5,
    color: COLORS.line,
  });
  const size = TYPE.tableHeader;
  const font = ctx.fonts.bold;
  const headerTextY = headerY - mmToPt(3.5);
  drawRightAlignedText(ctx.page, t(ctx.labels.columnBudget), cols.budget, headerTextY, font, size, COLORS.muted);
  drawRightAlignedText(ctx.page, t(ctx.labels.columnActual), cols.actual, headerTextY, font, size, COLORS.muted);
  drawRightAlignedText(ctx.page, t(ctx.labels.columnForecast), cols.forecast, headerTextY, font, size, COLORS.muted);
  drawRightAlignedText(
    ctx.page,
    t(ctx.labels.columnVarianceVsBudget),
    cols.variance,
    headerTextY,
    font,
    size,
    COLORS.muted,
  );
  ctx.y = headerY - mmToPt(6);
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
  options: { bold?: boolean; indent?: number; emphasis?: boolean } = {},
): LayoutContext {
  let next = ensureSpace(ctx, mmToPt(7));
  if (!next.tableHeaderDrawnOnPage) {
    next = drawTableHeader(next);
  }
  const cols = columnRights();
  const currency = next.presentation.pnl.baseCurrency;
  const font = options.bold || options.emphasis ? next.fonts.bold : next.fonts.regular;
  const size = options.emphasis ? TYPE.tableRowBold : options.bold ? TYPE.tableRowBold : TYPE.tableRow;
  const indent = options.indent ?? 0;
  const labelX = MARGIN_X + indent;
  const maxLabelWidth = cols.budget - labelX - mmToPt(5);

  const labelY = next.y;
  const labelEndY = drawWrappedTextBlock(
    next.page,
    label,
    labelX,
    labelY,
    maxLabelWidth,
    size,
    font,
    COLORS.text,
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
    drawRightAlignedText(next.page, t(values[i]!), xs[i]!, rowY, font, size, COLORS.text);
  }

  next.y = Math.min(next.y - mmToPt(5.5), labelEndY - mmToPt(1));
  if (options.emphasis) {
    next.page.drawLine({
      start: { x: MARGIN_X, y: next.y + mmToPt(2) },
      end: { x: PAGE_W - MARGIN_X, y: next.y + mmToPt(2) },
      thickness: 0.75,
      color: COLORS.text,
    });
    next.y -= mmToPt(2);
  } else if (options.bold) {
    next.page.drawLine({
      start: { x: MARGIN_X, y: next.y + mmToPt(1.5) },
      end: { x: PAGE_W - MARGIN_X, y: next.y + mmToPt(1.5) },
      thickness: 0.35,
      color: COLORS.line,
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
      next = drawAmountRow(next, ctx.labels.unassignedGroup, node, {
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

function drawMasthead(ctx: LayoutContext, input: FinancePublicationPdfDocumentInput): LayoutContext {
  const { presentation, fonts, labels } = ctx;
  const identity = presentation.identity;
  const yearLabel = extractPublicationYearLabel(identity.financeYearName);
  let y = ctx.y;

  if (input.organisationLogoBytes && input.organisationLogoMime === "image/png") {
    void input.organisationLogoBytes;
  }

  ctx.page.drawText(t(input.organisationName.toUpperCase()), {
    x: MARGIN_X,
    y,
    size: TYPE.mastheadClub,
    font: fonts.bold,
    color: COLORS.text,
  });
  y -= mmToPt(8);

  const reportHeading = labels.financialReportHeading.replace("{year}", yearLabel);
  ctx.page.drawText(t(reportHeading), {
    x: MARGIN_X,
    y,
    size: TYPE.mastheadReport,
    font: fonts.bold,
    color: COLORS.accent,
  });
  y -= mmToPt(5);

  ctx.page.drawText(t(labels.reportTypeSubtitle), {
    x: MARGIN_X,
    y,
    size: TYPE.mastheadSubtitle,
    font: fonts.regular,
    color: COLORS.text,
  });
  y -= mmToPt(6);

  const officialLine = labels.officialPublicationLine.replace(
    "{version}",
    String(identity.publicationVersion),
  );
  ctx.page.drawText(t(officialLine), {
    x: MARGIN_X,
    y,
    size: TYPE.mastheadMeta,
    font: fonts.bold,
    color: COLORS.muted,
  });
  y -= mmToPt(4);

  ctx.page.drawText(
    t(`${labels.publishedAtLabel} ${formatDateTime(identity.publishedAt, ctx.locale)}`),
    { x: MARGIN_X, y, size: TYPE.mastheadMeta, font: fonts.regular, color: COLORS.muted },
  );

  ctx.y = y - mmToPt(10);
  return ctx;
}

function drawHeroConclusion(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const pnl = presentation.pnl;
  const currency = pnl.baseCurrency;
  const forecast = pnl.managementResult.currentForecast;
  const budget = pnl.managementResult.approvedBudget;
  const actual = pnl.managementResult.actual;
  const variance = pnl.interpretation.forecastVsBudgetManagementResult;

  const heroTop = ctx.y;
  const heroHeight = mmToPt(32);
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: heroTop - heroHeight,
    width: PAGE_W - MARGIN_X * 2,
    height: heroHeight,
    color: COLORS.heroBg,
  });

  const innerX = MARGIN_X + mmToPt(5);
  let y = heroTop - mmToPt(7);

  ctx.page.drawText(t(labels.expectedResultLabel.toUpperCase()), {
    x: innerX,
    y,
    size: TYPE.heroLabel,
    font: fonts.bold,
    color: COLORS.muted,
  });
  y -= mmToPt(8);

  const forecastValue = formatManagementPnlMeasureCell(forecast, currency, locale);
  ctx.page.drawText(t(forecastValue), {
    x: innerX,
    y,
    size: TYPE.heroValue,
    font: fonts.bold,
    color: COLORS.text,
  });

  const varianceValue = formatManagementPnlVarianceDelta(variance, currency, locale);
  const favText = favorabilityText(variance, labels);
  y -= mmToPt(9);
  const varianceColor =
    variance.favorability === "FAVORABLE"
      ? COLORS.favorable
      : variance.favorability === "UNFAVORABLE"
        ? COLORS.unfavorable
        : COLORS.text;
  const varianceLine = favText
    ? `${varianceValue} ${labels.varianceVsBudgetLabel} · ${favText}`
    : `${varianceValue} ${labels.varianceVsBudgetLabel}`;
  ctx.page.drawText(t(varianceLine), {
    x: innerX,
    y,
    size: TYPE.heroVariance,
    font: fonts.regular,
    color: varianceColor,
  });

  const supportY = heroTop - heroHeight + mmToPt(5);
  const supportCols = [
    { label: labels.budgetResultLabel, value: formatManagementPnlMeasureCell(budget, currency, locale) },
    { label: labels.actualResultLabel, value: formatManagementPnlMeasureCell(actual, currency, locale) },
  ];
  const colWidth = (PAGE_W - MARGIN_X * 2 - mmToPt(10)) / 2;
  for (let i = 0; i < supportCols.length; i += 1) {
    const col = supportCols[i]!;
    const x = innerX + i * colWidth;
    ctx.page.drawText(t(col.label), { x, y: supportY + mmToPt(4), size: TYPE.heroSupporting, font: fonts.regular, color: COLORS.muted });
    ctx.page.drawText(t(col.value), { x, y: supportY, size: TYPE.heroSupporting + 1, font: fonts.bold, color: COLORS.text });
  }

  ctx.y = heroTop - heroHeight - mmToPt(8);
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

function drawManagementInterpretation(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const insights = presentation.pnl.comparativeIntelligence.attentionInsights;
  const currency = presentation.pnl.baseCurrency;

  ctx.page.drawText(t(labels.managementAssessmentTitle.toUpperCase()), {
    x: MARGIN_X,
    y: ctx.y,
    size: TYPE.sectionHeading,
    font: fonts.bold,
    color: COLORS.accent,
  });
  ctx.y -= mmToPt(6);

  const overall = insights.find((i) => i.kind === "OVERALL_RESULT");
  if (overall && overall.kind === "OVERALL_RESULT") {
    const { title, detail } = formatAttentionDetail(overall, labels, currency, locale);
    ctx.page.drawText(t(title), {
      x: MARGIN_X,
      y: ctx.y,
      size: TYPE.body + 1,
      font: fonts.bold,
      color: COLORS.text,
    });
    ctx.y -= mmToPt(5);
    if (detail) {
      ctx.y = drawWrappedTextBlock(
        ctx.page,
        detail,
        MARGIN_X,
        ctx.y,
        PAGE_W - MARGIN_X * 2,
        TYPE.body,
        fonts.regular,
        COLORS.text,
        mmToPt(4.5),
      );
      ctx.y -= mmToPt(2);
    }
  }

  const fav = insights.find((i) => i.kind === "FAVORABLE_DRIVER");
  if (fav && fav.kind === "FAVORABLE_DRIVER") {
    const delta = formatManagementPnlVarianceDelta(fav.driver.comparison, currency, locale);
    const line = `${fav.driver.name} ${delta}`;
    ctx.page.drawText(t(labels.attentionLargestFavorableTitle), {
      x: MARGIN_X,
      y: ctx.y,
      size: TYPE.body,
      font: fonts.bold,
      color: COLORS.text,
    });
    ctx.y -= mmToPt(4.5);
    ctx.page.drawText(t(line), {
      x: MARGIN_X + mmToPt(2),
      y: ctx.y,
      size: TYPE.body,
      font: fonts.regular,
      color: COLORS.favorable,
    });
    ctx.y -= mmToPt(6);
  }

  const unfav = insights.find((i) => i.kind === "UNFAVORABLE_DRIVER");
  if (unfav && unfav.kind === "UNFAVORABLE_DRIVER") {
    const delta = formatManagementPnlVarianceDelta(unfav.driver.comparison, currency, locale);
    const suffix =
      unfav.driver.canonicalSemantic === "EXPENSE" ? ` ${labels.attentionDriverExpenseSuffix}` : "";
    const line = `${unfav.driver.name} ${delta}${suffix}`;
    ctx.page.drawText(t(labels.attentionLargestUnfavorableTitle), {
      x: MARGIN_X,
      y: ctx.y,
      size: TYPE.body,
      font: fonts.bold,
      color: COLORS.text,
    });
    ctx.y -= mmToPt(4.5);
    ctx.page.drawText(t(line), {
      x: MARGIN_X + mmToPt(2),
      y: ctx.y,
      size: TYPE.body,
      font: fonts.regular,
      color: COLORS.unfavorable,
    });
    ctx.y -= mmToPt(6);
  }

  ctx.y -= mmToPt(2);
  return ctx;
}

function drawStatementSection(ctx: LayoutContext): LayoutContext {
  const { labels, fonts, presentation } = ctx;
  const currency = presentation.pnl.baseCurrency;

  ctx.page.drawText(t(labels.statementSectionTitle.toUpperCase()), {
    x: MARGIN_X,
    y: ctx.y,
    size: TYPE.sectionHeading,
    font: fonts.bold,
    color: COLORS.accent,
  });
  ctx.y -= mmToPt(4);
  ctx.page.drawText(
    t(labels.amountsInCurrencyLabel.replace("{currency}", currency ?? "")),
    { x: MARGIN_X, y: ctx.y, size: TYPE.heroSupporting, font: fonts.regular, color: COLORS.muted },
  );
  ctx.y -= mmToPt(7);

  ctx.page.drawText(t(labels.incomeSection.toUpperCase()), {
    x: MARGIN_X,
    y: ctx.y,
    size: TYPE.body,
    font: fonts.bold,
    color: COLORS.text,
  });
  ctx.y -= mmToPt(5);
  let next = drawTableHeader({ ...ctx, tableHeaderDrawnOnPage: false });
  next = walkTree(next, presentation.pnl.incomeSection.nodes, 0);
  next = drawAmountRow(next, labels.incomeSectionTotal, presentation.pnl.incomeSection.sectionTotal, {
    bold: true,
  });

  next.y -= mmToPt(5);
  next = ensureSpace(next, mmToPt(24));
  next.page.drawText(t(labels.expenseSection.toUpperCase()), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.body,
    font: fonts.bold,
    color: COLORS.text,
  });
  next.y -= mmToPt(5);
  next = drawTableHeader({ ...next, tableHeaderDrawnOnPage: false });
  next = walkTree(next, presentation.pnl.expenseSection.nodes, 0);
  next = drawAmountRow(next, labels.expenseSectionTotal, presentation.pnl.expenseSection.sectionTotal, {
    bold: true,
  });

  next.y -= mmToPt(4);
  next = ensureSpace(next, mmToPt(10));
  next = drawAmountRow(next, labels.managementResult, presentation.pnl.managementResult, {
    emphasis: true,
  });

  return next;
}

function drawPublicationMetadata(ctx: LayoutContext, input: FinancePublicationPdfDocumentInput): LayoutContext {
  const identity = input.presentation.identity;
  const next = ensureSpace(ctx, mmToPt(28));

  next.y -= mmToPt(4);
  next.page.drawText(t(next.labels.publicationInfoTitle.toUpperCase()), {
    x: MARGIN_X,
    y: next.y,
    size: TYPE.sectionHeading,
    font: next.fonts.bold,
    color: COLORS.accent,
  });
  next.y -= mmToPt(6);

  const lines = [
    next.labels.versionLabel.replace("{version}", String(identity.publicationVersion)),
    `${next.labels.publishedAtLabel} ${formatDateTime(identity.publishedAt, next.locale)}`,
    `${next.labels.pdfGeneratedAtLabel} ${formatDateTime(input.generatedAt, next.locale)}`,
  ];

  for (const line of lines) {
    next.page.drawText(t(line), {
      x: MARGIN_X,
      y: next.y,
      size: TYPE.metadata,
      font: next.fonts.regular,
      color: COLORS.muted,
    });
    next.y -= mmToPt(4.5);
  }
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

  const footerLeft = `${input.organisationName} · ${input.labels.financialReportHeading.replace("{year}", yearLabel)} · ${input.labels.versionLabel.replace("{version}", String(identity.publicationVersion))}`;

  const firstPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let ctx: LayoutContext = {
    pdfDoc,
    page: firstPage,
    fonts,
    locale: input.formattingLocale,
    labels: input.labels,
    presentation: input.presentation,
    y: PAGE_H - MARGIN_TOP,
    pageIndex: 1,
    totalPages: 1,
    footerLeft,
    tableHeaderDrawnOnPage: false,
  };

  ctx = drawMasthead(ctx, input);
  ctx = drawHeroConclusion(ctx);
  ctx = ensureSpace(ctx, mmToPt(40));
  ctx = drawManagementInterpretation(ctx);
  ctx = ensureSpace(ctx, mmToPt(50));
  ctx = drawStatementSection(ctx);
  ctx = drawPublicationMetadata(ctx, input);

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
