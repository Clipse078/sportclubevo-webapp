import type { TargetPeriod, TargetStatus } from "@prisma/client";

/** German presentation labels for target lifecycle status (Zielstatus). */
export const TARGET_STATUS_LABELS: Record<TargetStatus, string> = {
  ACTIVE: "Aktiv",
  DRAFT: "Entwurf",
  PAUSED: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

export const TARGET_STATUS_BADGE_CLASSES: Record<TargetStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  PAUSED: "border-slate-200 bg-slate-50 text-[var(--text-2)]",
  COMPLETED: "border-blue-200 bg-blue-50 text-blue-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

/** German labels for TargetPeriod enum values. */
export const TARGET_PERIOD_LABELS: Record<TargetPeriod, string> = {
  SEASON: "Saison",
  QUARTER: "Quartal",
  YEAR: "Jahr",
  CUSTOM: "Benutzerdefiniert",
};

export const TARGET_CATEGORY_LABELS: Record<string, string> = {
  SPORTLICHE_ENTWICKLUNG: "Sportliche Entwicklung",
  MITGLIEDERWACHSTUM: "Mitgliederwachstum",
  FINANZEN: "Finanzen & Infrastruktur",
  AUSBILDUNG: "Ausbildung",
  MEDIEN_SOZIALES: "Medien & Soziales",
  GOVERNANCE: "Vereinsführung",
};

export function formatTargetPeriodLabel(period: TargetPeriod | string, periodLabel?: string | null): string {
  if (periodLabel?.trim()) return periodLabel.trim();
  return TARGET_PERIOD_LABELS[period as TargetPeriod] ?? String(period);
}

export function formatTargetStatusLabel(status: TargetStatus | string): string {
  return TARGET_STATUS_LABELS[status as TargetStatus] ?? String(status);
}