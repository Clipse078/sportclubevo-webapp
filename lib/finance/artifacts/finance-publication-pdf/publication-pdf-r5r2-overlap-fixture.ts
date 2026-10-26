import { mmToPt } from "@/lib/billing/invoice-pdf/mm";
import type { PublicationPdfRecordedTextDraw } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-draw-recorder";
import { publicationPdfTextInkBoundsFromBaseline } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-font-metrics";
import { publicationPdfTypography as TYPE } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-typography";
import { publicationPdfVerticalSpacePt } from "@/lib/finance/artifacts/finance-publication-pdf/publication-pdf-vertical-spacing";

/**
 * Synthetic draw log reproducing R5R2 publication evidence cursor steps:
 * spacing tokens between baselines without ink-aware line height (da9360d8).
 */
export function buildPublicationPdfR5R2DefectiveEvidenceDraws(input?: {
  sectionStartBaselineY?: number;
}): PublicationPdfRecordedTextDraw[] {
  const noteSize = TYPE.publicationNote;
  const headingSize = TYPE.evidenceSectionHeading;
  let baselineY = input?.sectionStartBaselineY ?? 420;
  const draws: PublicationPdfRecordedTextDraw[] = [];

  const push = (blockId: string, text: string, fontSize: number, lineHeight: number) => {
    const { topY, bottomY } = publicationPdfTextInkBoundsFromBaseline(baselineY, fontSize);
    draws.push({
      kind: "text",
      blockId,
      pageIndex: 0,
      x: mmToPt(18),
      y: baselineY,
      width: mmToPt(80),
      topY,
      bottomY,
      text,
      fontSize,
      lineHeight,
    });
  };

  push("publicationEvidence.heading", "Publikationsinformationen", headingSize, headingSize);
  baselineY -= publicationPdfVerticalSpacePt("sm");

  push(
    "publicationEvidence.versionLine",
    "Version 2 · Veröffentlicht 26.10.2026, 09:39",
    noteSize,
    noteSize,
  );
  baselineY -= publicationPdfVerticalSpacePt("xs");

  push(
    "publicationEvidence.pdfCreatedLine",
    "PDF erstellt 26.10.2026, 09:39",
    noteSize,
    noteSize,
  );
  baselineY -= publicationPdfVerticalSpacePt("2xs");

  push(
    "publicationEvidence.immutabilityNotice",
    "Diese Veröffentlichung basiert auf einem unveränderlichen Stand",
    noteSize,
    mmToPt(4),
  );
  baselineY -= mmToPt(4);
  push(
    "publicationEvidence.immutabilityNotice",
    "der Finanzdaten zum Zeitpunkt der Veröffentlichung.",
    noteSize,
    mmToPt(4),
  );

  return draws;
}
