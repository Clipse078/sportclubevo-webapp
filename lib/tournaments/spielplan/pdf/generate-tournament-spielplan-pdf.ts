import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TournamentSpielplanTeamPlan, TournamentSpielplanViewModel } from "../types";

export type SpielplanPdfMode = "MASTER" | "TEAM";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export async function generateTournamentSpielplanPdf(input: {
  model: TournamentSpielplanViewModel;
  mode: SpielplanPdfMode;
  teamPlan?: TournamentSpielplanTeamPlan | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const landscape = input.mode === "MASTER";
  const pageSize: [number, number] = landscape ? [842, 595] : [595, 842];
  let page = pdf.addPage(pageSize);
  let y = page.getHeight() - 48;
  const margin = 40;
  const lineHeight = 14;

  const drawLine = (text: string, bold = false) => {
    if (y < margin + lineHeight) {
      page = pdf.addPage(pageSize);
      y = page.getHeight() - 48;
    }
    page.drawText(truncate(text, 120), {
      x: margin,
      y,
      size: bold ? 12 : 10,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  };

  const { identity } = input.model;
  pdf.setTitle(
    input.mode === "MASTER"
      ? `Spielplan ${identity.title}`
      : `Team-Spielplan ${input.teamPlan?.displayName ?? ""}`.trim(),
  );
  pdf.setProducer("SportClubEvo Tournament Planner");

  if (identity.tenantName) drawLine(identity.tenantName, true);
  drawLine(identity.title, true);
  drawLine(identity.dateLabel);
  if (identity.location) drawLine(identity.location);
  if (identity.organizerName) drawLine(`Veranstalter: ${identity.organizerName}`);
  y -= 6;

  if (input.mode === "MASTER") {
    drawLine("Master-Spielplan", true);
    for (const row of input.model.matrixRows) {
      if (row.kind === "ALL_PITCHES_BREAK") {
        drawLine(`${row.timeLabel} · ${row.label}`);
        continue;
      }
      const pitchParts = input.model.pitches.map((pitch) => {
        const cell = row.cellsByPitchId[pitch.pitchId];
        if (!cell || cell.kind === "EMPTY") return `${pitch.label}: —`;
        if (cell.kind === "PITCH_BLOCKED") return `${pitch.label}: ${cell.label}`;
        const score = cell.result
          ? ` (${cell.result.scoreSideA}:${cell.result.scoreSideB})`
          : "";
        return `${pitch.label}: ${cell.pairingLabel}${score}`;
      });
      drawLine(
        `${row.timeLabel}${row.roundTitle ? ` · ${row.roundTitle}` : ""} — ${pitchParts.join(" | ")}`,
      );
    }
  } else if (input.teamPlan) {
    drawLine(input.teamPlan.displayName, true);
    for (const entry of input.teamPlan.entries) {
      if (entry.kind === "BREAK") {
        drawLine(`${entry.timeLabel} · ${entry.label}`);
      } else {
        const score = entry.scoreLabel ? ` · ${entry.scoreLabel}` : "";
        drawLine(
          `${entry.timeLabel} · ${entry.pitchLabel} · vs ${entry.opponentLabel}${score}`,
        );
      }
    }
  }

  return pdf.save();
}
