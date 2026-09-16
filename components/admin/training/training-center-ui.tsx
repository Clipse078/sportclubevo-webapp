import { cn } from "@/lib/cn";

export const trainingCenterFieldClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sce-primary)_35%,transparent)]";

export const trainingCenterLabelClass = "mb-1.5 block text-sm font-medium text-[var(--foreground)]";

export const trainingCenterHelperClass = "mt-1 text-xs text-[var(--muted)]";

export const trainingCenterSectionTitleClass = "text-base font-semibold text-[var(--foreground)]";

export function SessionReadinessBadge({
  status,
  className,
}: {
  status: "READY" | "OPEN" | "NOT_APPLICABLE";
  className?: string;
}) {
  if (status === "OPEN") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sce-warning)]",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sce-warning)]" aria-hidden />
        Offen
      </span>
    );
  }
  if (status === "NOT_APPLICABLE") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]", className)}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden />
        Abgesagt
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-2)]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sce-success)]" aria-hidden />
      Bereit
    </span>
  );
}

export function SeriesLifecycleBadge({
  status,
}: {
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}) {
  const label = status === "ACTIVE" ? "Aktiv" : status === "INACTIVE" ? "Inaktiv" : "Archiviert";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold",
        status === "ACTIVE" &&
          "border-[color-mix(in_srgb,var(--sce-success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--sce-success)_12%,var(--surface))] text-[var(--foreground)]",
        status === "INACTIVE" &&
          "border-[color-mix(in_srgb,var(--sce-warning)_35%,var(--border))] bg-[color-mix(in_srgb,var(--sce-warning)_10%,var(--surface))] text-[var(--foreground)]",
        status === "ARCHIVED" && "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
      )}
    >
      {label}
    </span>
  );
}

export function monthEntryTone(status: "READY" | "OPEN" | "NOT_APPLICABLE"): string {
  if (status === "NOT_APPLICABLE") {
    return "border-[var(--border)] bg-[var(--surface-2)]/80 text-[var(--muted)] line-through";
  }
  if (status === "OPEN") {
    return "border-[color-mix(in_srgb,var(--sce-warning)_40%,var(--border))] bg-[color-mix(in_srgb,var(--sce-warning)_8%,var(--surface))] text-[var(--foreground)]";
  }
  return "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--border-strong)]";
}
