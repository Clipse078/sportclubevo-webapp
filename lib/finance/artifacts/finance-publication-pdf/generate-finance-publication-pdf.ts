import { PDFDocument, type PDFPage, rgb, type PDFFont } from "pdf-lib";
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
import type {
  FinancePublicationPdfDocumentInput,
  FinancePublicationPdfGenerationResult,
} from "@/lib/finance/artifacts/finance-publication-pdf/finance-publication-pdf-types";
import { buildFinancePublicationPdfFilename } from "@/lib/finance/artifacts/finance-publication-pdf/sanitize-finance-publication-pdf-filename";
import { pdfSafeText } from "@/lib/finance/artifacts/finance-publication-pdf/pdf-safe-text";

function t(value: string): string {
  return pdfSafeText(value);
}

const PAGE_W = mmToPt(A4_WIDTH_MM);
const PAGE_H = mmToPt(A4_HEIGHT_MM);
const MARGIN_X = mmToPt(18);
const MARGIN_TOP = mmToPt(22);
const MARGIN_BOTTOM = mmToPt(20);
const CONTENT_BOTTOM = MARGIN_BOTTOM + mmToPt(12);

const COLORS = {
  text: rgb(0.09, 0.11, 0.15),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.82, 0.84, 0.87),
  headerBg: rgb(0.96, 0.97, 0.98),
  accent: rgb(0.07, 0.17, 0.29),
} as const;

type Fonts = { regular: PDFFont; bold: PDFFont };

type LayoutContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  locale: string;
  labels: FinancePublicationPdfDocumentInput["labels"];
  presentation: FinancePublicationPdfDocumentInput["presentation"];
  y: number;
  pageIndex: number;
  footerIdentity: string;
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

function favorabilityText(
  slice: FinanceReportingComparisonSlice,
  labels: FinancePublicationPdfDocumentInput["labels"],
): string | null {
  if (slice.availability !== "AVAILABLE" || slice.favorability === null) return null;
  const key = financeVarianceFavorabilityLabelKey(slice.favorability);
  if (key === "favorabilityFavorable") return labels.favorabilityFavorable;
  if (key === "favorabilityUnfavorable") return labels.favorabilityUnfavorable;
  return labels.favorabilityOnPlan;
}

function newPage(ctx: LayoutContext): LayoutContext {
  const page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  const pageIndex = ctx.pageIndex + 1;
  return { ...ctx, page, y: PAGE_H - MARGIN_TOP, pageIndex };
}

function ensureSpace(ctx: LayoutContext, neededPt: number): LayoutContext {
  if (ctx.y - neededPt >= CONTENT_BOTTOM) return ctx;
  const next = newPage(ctx);
  drawTableHeader(next);
  return next;
}

function drawFooter(ctx: LayoutContext): void {
  const { page, fonts, labels, pageIndex, footerIdentity } = ctx;
  const footerY = MARGIN_BOTTOM - mmToPt(2);
  page.drawLine({
    start: { x: MARGIN_X, y: footerY + mmToPt(4) },
    end: { x: PAGE_W - MARGIN_X, y: footerY + mmToPt(4) },
    thickness: 0.5,
    color: COLORS.line,
  });
  page.drawText(t(footerIdentity), {
    x: MARGIN_X,
    y: footerY,
    size: 7,
    font: fonts.regular,
    color: COLORS.muted,
  });
  const pageText = t(`${labels.pageLabel} ${pageIndex}`);
  drawRightAlignedText(page, pageText, PAGE_W - MARGIN_X, footerY, fonts.regular, 7, COLORS.muted);
}

function finalizePage(ctx: LayoutContext): void {
  drawFooter(ctx);
}

function drawWrappedText(
  ctx: LayoutContext,
  text: string,
  x: number,
  maxWidth: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
): number {
  const words = t(text).split(/\s+/).filter(Boolean);
  let line = "";
  let y = ctx.y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      ctx.page.drawText(t(line), { x, y, size, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ctx.page.drawText(t(line), { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function columnXs(): { label: number; budget: number; actual: number; forecast: number; variance: number } {
  const right = PAGE_W - MARGIN_X;
  return {
    label: MARGIN_X,
    budget: right - mmToPt(95),
    actual: right - mmToPt(72),
    forecast: right - mmToPt(49),
    variance: right - mmToPt(26),
  };
}

function drawTableHeader(ctx: LayoutContext): void {
  const cols = columnXs();
  const headerY = ctx.y;
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: headerY - mmToPt(6),
    width: PAGE_W - MARGIN_X * 2,
    height: mmToPt(7),
    color: COLORS.headerBg,
  });
  const size = 8;
  ctx.page.drawText(t(ctx.labels.columnBudget), {
    x: cols.budget,
    y: headerY - mmToPt(4.5),
    size,
    font: ctx.fonts.bold,
    color: COLORS.muted,
  });
  ctx.page.drawText(t(ctx.labels.columnActual), {
    x: cols.actual,
    y: headerY - mmToPt(4.5),
    size,
    font: ctx.fonts.bold,
    color: COLORS.muted,
  });
  ctx.page.drawText(t(ctx.labels.columnForecast), {
    x: cols.forecast,
    y: headerY - mmToPt(4.5),
    size,
    font: ctx.fonts.bold,
    color: COLORS.muted,
  });
  ctx.page.drawText(t(ctx.labels.columnVariance), {
    x: cols.variance,
    y: headerY - mmToPt(4.5),
    size,
    font: ctx.fonts.bold,
    color: COLORS.muted,
  });
  ctx.y = headerY - mmToPt(8);
}

function drawAmountRow(
  ctx: LayoutContext,
  label: string,
  cells: {
    approvedBudget: Parameters<typeof formatManagementPnlMeasureCell>[0];
    actual: Parameters<typeof formatManagementPnlMeasureCell>[0];
    currentForecast: Parameters<typeof formatManagementPnlMeasureCell>[0];
    forecastVsBudget: FinanceReportingComparisonSlice;
  },
  options: { bold?: boolean; indent?: number } = {},
): LayoutContext {
  const next = ensureSpace(ctx, mmToPt(6));
  const cols = columnXs();
  const currency = next.presentation.pnl.baseCurrency;
  const font = options.bold ? next.fonts.bold : next.fonts.regular;
  const size = options.bold ? 9 : 8.5;
  const indent = options.indent ?? 0;
  const labelX = cols.label + indent;
  const maxLabelWidth = cols.budget - labelX - mmToPt(4);

  const displayLabel =
    font.widthOfTextAtSize(label, size) > maxLabelWidth
      ? `${label.slice(0, Math.max(8, Math.floor(label.length * 0.85)))}…`
      : label;
  next.page.drawText(t(displayLabel), {
    x: labelX,
    y: next.y,
    size,
    font,
    color: COLORS.text,
  });

  const rowY = next.y;
  const values = [
    formatManagementPnlMeasureCell(cells.approvedBudget, currency, next.locale),
    formatManagementPnlMeasureCell(cells.actual, currency, next.locale),
    formatManagementPnlMeasureCell(cells.currentForecast, currency, next.locale),
    formatManagementPnlVarianceDelta(cells.forecastVsBudget, currency, next.locale),
  ];
  const xs = [cols.budget, cols.actual, cols.forecast, cols.variance];
  for (let i = 0; i < values.length; i += 1) {
    drawRightAlignedText(next.page, t(values[i]!), xs[i]!, rowY, font, size, COLORS.text);
  }
  next.y = rowY - mmToPt(5.5);
  return next;
}

function walkTree(ctx: LayoutContext, nodes: readonly SerializedManagementPnlTreeNode[], depth: number): LayoutContext {
  let next = ctx;
  for (const node of nodes) {
    if (node.kind === "reporting_group") {
      next = drawAmountRow(
        next,
        node.name,
        node,
        { bold: depth === 0, indent: depth * mmToPt(4) },
      );
      next = walkTree(next, node.children, depth + 1);
    } else if (node.kind === "account") {
      next = drawAmountRow(next, node.name, node, { indent: (depth + 1) * mmToPt(4) });
    } else if (node.kind === "unassigned_residual") {
      next = drawAmountRow(
        next,
        ctx.labels.unassignedGroup,
        node,
        { bold: true, indent: depth * mmToPt(4) },
      );
      for (const account of node.accounts) {
        next = drawAmountRow(next, account.name, account, {
          indent: (depth + 2) * mmToPt(4),
        });
      }
    }
  }
  return next;
}

function drawExecutiveSummary(ctx: LayoutContext): LayoutContext {
  const { presentation, labels, fonts, locale } = ctx;
  const pnl = presentation.pnl;
  const currency = pnl.baseCurrency;
  const forecast = pnl.managementResult.currentForecast;
  const budget = pnl.managementResult.approvedBudget;
  const actual = pnl.managementResult.actual;
  const variance = pnl.interpretation.forecastVsBudgetManagementResult;

  ctx.page.drawText(t(labels.executiveSummaryTitle), {
    x: MARGIN_X,
    y: ctx.y,
    size: 11,
    font: fonts.bold,
    color: COLORS.accent,
  });
  ctx.y -= mmToPt(8);

  const metrics: { label: string; value: string; sub?: string }[] = [
    {
      label: labels.expectedResultLabel,
      value: formatManagementPnlMeasureCell(forecast, currency, locale),
    },
    {
      label: labels.budgetResultLabel,
      value: formatManagementPnlMeasureCell(budget, currency, locale),
    },
    {
      label: labels.actualResultLabel,
      value: formatManagementPnlMeasureCell(actual, currency, locale),
    },
    {
      label: labels.varianceVsBudgetLabel,
      value: formatManagementPnlVarianceDelta(variance, currency, locale),
      sub: favorabilityText(variance, labels) ?? undefined,
    },
  ];

  const boxTop = ctx.y;
  const boxHeight = mmToPt(28);
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: boxTop - boxHeight,
    width: PAGE_W - MARGIN_X * 2,
    height: boxHeight,
    borderColor: COLORS.line,
    borderWidth: 0.75,
  });

  const colWidth = (PAGE_W - MARGIN_X * 2) / 2;
  const metricY = boxTop - mmToPt(7);
  for (let i = 0; i < metrics.length; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN_X + mmToPt(4) + col * colWidth;
    const y = metricY - row * mmToPt(11);
    const metric = metrics[i]!;
    ctx.page.drawText(t(metric.label), { x, y: y + mmToPt(4), size: 8, font: fonts.regular, color: COLORS.muted });
    const valueText = t(metric.value);
    ctx.page.drawText(valueText, { x, y, size: 12, font: fonts.bold, color: COLORS.text });
    if (metric.sub) {
      ctx.page.drawText(t(metric.sub), {
        x: x + fonts.bold.widthOfTextAtSize(valueText, 12) + mmToPt(2),
        y: y + mmToPt(1),
        size: 8,
        font: fonts.regular,
        color: COLORS.muted,
      });
    }
  }

  ctx.y = boxTop - boxHeight - mmToPt(10);
  return ctx;
}

function drawIdentityHeader(ctx: LayoutContext, input: FinancePublicationPdfDocumentInput): LayoutContext {
  const { presentation, fonts, labels } = ctx;
  const identity = presentation.identity;
  let y = ctx.y;

  if (input.organisationLogoBytes && input.organisationLogoMime) {
    void input.organisationLogoBytes;
    // Logo embed is best-effort in R1 — organisation name remains authoritative.
  }

  y = drawWrappedText(
    ctx,
    input.organisationName,
    MARGIN_X,
    PAGE_W - MARGIN_X * 2,
    16,
    fonts.bold,
    COLORS.text,
    mmToPt(7),
  );

  ctx.page.drawText(t(identity.title), {
    x: MARGIN_X,
    y: y - mmToPt(2),
    size: 13,
    font: fonts.regular,
    color: COLORS.text,
  });
  y -= mmToPt(8);

  ctx.page.drawText(
    t(`${labels.financialYearLabel}: ${identity.financeYearName}`),
    { x: MARGIN_X, y, size: 10, font: fonts.regular, color: COLORS.muted },
  );
  y -= mmToPt(5);

  ctx.page.drawText(
    t(labels.publishedVersionLabel.replace("{version}", String(identity.publicationVersion))),
    { x: MARGIN_X, y, size: 10, font: fonts.bold, color: COLORS.accent },
  );
  y -= mmToPt(4);

  ctx.page.drawText(
    t(`${labels.publishedAtLabel}: ${formatDateTime(identity.publishedAt, ctx.locale)}`),
    { x: MARGIN_X, y, size: 9, font: fonts.regular, color: COLORS.muted },
  );

  ctx.y = y - mmToPt(12);
  return ctx;
}

function drawMetadataBlock(ctx: LayoutContext, input: FinancePublicationPdfDocumentInput): LayoutContext {
  const identity = input.presentation.identity;
  const lines = [
    `${input.labels.publicationReferenceLabel}: ${identity.title} · ${identity.financeYearName} · V${identity.publicationVersion}`,
    `${input.labels.publishedAtLabel}: ${formatDateTime(identity.publishedAt, ctx.locale)}`,
    `${input.labels.pdfGeneratedAtLabel}: ${formatDateTime(input.generatedAt, ctx.locale)}`,
    input.labels.sportClubEvoDocumentMark,
  ];

  const next = ensureSpace(ctx, mmToPt(6 + lines.length * 4));
  next.y -= mmToPt(4);
  for (const line of lines) {
    next.page.drawText(t(line), {
      x: MARGIN_X,
      y: next.y,
      size: 8,
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
  pdfDoc.setTitle(`${input.organisationName} — ${identity.title} — V${identity.publicationVersion}`);
  pdfDoc.setProducer("SportClubEvo Finance");
  pdfDoc.setCreationDate(input.generatedAt);
  pdfDoc.setModificationDate(input.generatedAt);

  const footerIdentity = `${identity.title} · ${identity.financeYearName} · V${identity.publicationVersion}`;

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
    footerIdentity,
  };

  ctx = drawIdentityHeader(ctx, input);
  ctx = drawExecutiveSummary(ctx);

  ctx.page.drawText(t(ctx.labels.incomeSection), {
    x: MARGIN_X,
    y: ctx.y,
    size: 10,
    font: fonts.bold,
    color: COLORS.accent,
  });
  ctx.y -= mmToPt(6);
  drawTableHeader(ctx);
  ctx = walkTree(ctx, input.presentation.pnl.incomeSection.nodes, 0);
  ctx = drawAmountRow(ctx, ctx.labels.incomeSectionTotal, input.presentation.pnl.incomeSection.sectionTotal, {
    bold: true,
  });

  ctx.y -= mmToPt(6);
  ctx = ensureSpace(ctx, mmToPt(20));
  ctx.page.drawText(t(ctx.labels.expenseSection), {
    x: MARGIN_X,
    y: ctx.y,
    size: 10,
    font: fonts.bold,
    color: COLORS.accent,
  });
  ctx.y -= mmToPt(6);
  drawTableHeader(ctx);
  ctx = walkTree(ctx, input.presentation.pnl.expenseSection.nodes, 0);
  ctx = drawAmountRow(ctx, ctx.labels.expenseSectionTotal, input.presentation.pnl.expenseSection.sectionTotal, {
    bold: true,
  });

  ctx.y -= mmToPt(6);
  ctx = ensureSpace(ctx, mmToPt(12));
  ctx = drawAmountRow(ctx, ctx.labels.managementResult, input.presentation.pnl.managementResult, {
    bold: true,
  });

  ctx = drawMetadataBlock(ctx, input);

  for (let i = 0; i < pdfDoc.getPageCount(); i += 1) {
    const page = pdfDoc.getPage(i);
    finalizePage({
      ...ctx,
      page,
      pageIndex: i + 1,
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
    pageCount: pdfDoc.getPageCount(),
    filename,
  };
}
