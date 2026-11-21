import type { SceCdOverviewGridColumn } from "./sce-club-development-surface-styles";
import { SCE_CD_OVERVIEW_GRID_COLUMNS } from "./sce-club-development-surface-styles";

export const SCE_CD_OVERVIEW_ALIGN_COLUMNS: SceCdOverviewGridColumn[] = ["kontext", "status", "verantwortlich"];

/** Synthetic column offsets for jsdom (fixed grid tracks at sm breakpoint). */
const OVERVIEW_COLUMN_OFFSET_PX: Record<SceCdOverviewGridColumn, number> = {
  referenz: 0,
  titel: 136,
  kontext: 380,
  status: 540,
  progress: 632,
  verantwortlich: 828,
  actions: 944,
};

const GRID_INSET_PX = 24;

export function collectOverviewGridColumnCells(root: ParentNode, column: SceCdOverviewGridColumn): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-sce-overview-col="${column}"]`));
}

function extractOverviewGridTemplate(className: string): string {
  const match = className.match(/sm:grid-cols-\[[^\]]+\]/);
  return match?.[0] ?? "";
}

export function assertOverviewHeadersShareGridTemplate(headers: HTMLElement[]) {
  if (headers.length === 0) return;
  const templates = headers.map((header) => extractOverviewGridTemplate(header.className));
  const gridClass = templates[0] ?? "";
  for (const template of templates) {
    if (template !== gridClass) {
      throw new Error("Übersicht section headers use different grid templates");
    }
  }
  if (gridClass.includes("max-content")) {
    throw new Error("Übersicht grid must not use max-content tracks");
  }
}

export function compareOverviewColumnOffsets(
  container: ParentNode,
  column: SceCdOverviewGridColumn,
): { lefts: number[]; aligned: boolean } {
  const lefts = collectOverviewGridColumnCells(container, column).map(
    (cell) => cell.getBoundingClientRect().left,
  );
  if (lefts.length < 2) {
    return { lefts, aligned: true };
  }
  const base = lefts[0]!;
  const aligned = lefts.every((left) => Math.abs(left - base) < 0.5);
  return { lefts, aligned };
}

/** Install consistent getBoundingClientRect mocks from `data-sce-overview-col`. */
export function installOverviewGridLayoutMocks(container: HTMLElement) {
  for (const column of SCE_CD_OVERVIEW_GRID_COLUMNS) {
    const left = GRID_INSET_PX + OVERVIEW_COLUMN_OFFSET_PX[column];
    for (const cell of container.querySelectorAll<HTMLElement>(`[data-sce-overview-col="${column}"]`)) {
      Object.defineProperty(cell, "getBoundingClientRect", {
        configurable: true,
        value: () => ({
          left,
          top: 0,
          right: left + 80,
          bottom: 24,
          width: 80,
          height: 24,
          x: left,
          y: 0,
          toJSON: () => ({}),
        }),
      });
    }
  }
}