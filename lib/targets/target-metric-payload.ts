import { TargetDirection, TargetMetricType } from "@prisma/client";

export type TargetMetricBodyInput = {
  id?: string;
  label?: string;
  type?: string;
  direction?: string;
  targetValue?: unknown;
  currentValue?: unknown;
  unit?: string | null;
  notes?: string | null;
  sortOrder?: number;
};

export type NormalizedTargetMetric = {
  id?: string;
  label: string;
  type: TargetMetricType;
  direction: TargetDirection;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  notes: string | null;
  sortOrder: number;
};

/**
 * Parses a metric numeric field from form/API input.
 * Empty / whitespace → null (blank). Numeric strings including "0" parse to a number.
 */
export function parseTargetMetricNumericInput(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatTargetMetricNumericForForm(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
}

type NormalizeResult =
  | { ok: true; metrics: NormalizedTargetMetric[] }
  | { ok: false; error: string };

/**
 * Normalizes metric rows from a target create/update JSON body.
 * Rows without a label are omitted. Labeled rows require parseable target and current values.
 */
export function normalizeTargetMetricsFromBody(
  raw: unknown,
): NormalizeResult {
  if (raw !== undefined && !Array.isArray(raw)) {
    return { ok: false, error: "Kennzahlen konnten nicht gelesen werden." };
  }

  const rows: TargetMetricBodyInput[] = Array.isArray(raw) ? raw : [];
  const validTypes = Object.values(TargetMetricType);
  const validDirections = Object.values(TargetDirection);
  const metrics: NormalizedTargetMetric[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const label = (row?.label ?? "").trim();
    if (!label) continue;

    const targetValue = parseTargetMetricNumericInput(row?.targetValue);
    const currentValue = parseTargetMetricNumericInput(row?.currentValue);

    if (targetValue === null) {
      return {
        ok: false,
        error: `Kennzahl „${label}“: Zielwert ist erforderlich (0 ist gültig).`,
      };
    }
    if (currentValue === null) {
      return {
        ok: false,
        error: `Kennzahl „${label}“: Aktueller Wert ist erforderlich (0 ist gültig).`,
      };
    }

    const type = validTypes.includes(row?.type as TargetMetricType)
      ? (row.type as TargetMetricType)
      : TargetMetricType.PERCENTAGE;
    const direction = validDirections.includes(row?.direction as TargetDirection)
      ? (row.direction as TargetDirection)
      : TargetDirection.INCREASE;

    const id = typeof row?.id === "string" && row.id.trim() ? row.id.trim() : undefined;

    metrics.push({
      id,
      label,
      type,
      direction,
      targetValue,
      currentValue,
      unit: row?.unit?.trim() ? row.unit.trim() : null,
      notes: row?.notes?.trim() ? row.notes.trim() : null,
      sortOrder: typeof row?.sortOrder === "number" ? row.sortOrder : idx,
    });
  }

  return { ok: true, metrics };
}