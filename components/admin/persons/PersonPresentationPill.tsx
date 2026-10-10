import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { normalizeOptionalPresentationLabel } from "@/lib/people/person-presentation-label";

const semanticPillBase =
  "inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--sce-accent)_28%,transparent)] bg-[var(--sce-accent-subtle)] font-semibold uppercase tracking-wider text-[var(--sce-accent)]";

const warningPillBase =
  "inline-flex items-center rounded-full border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] font-semibold uppercase tracking-wider text-[var(--sce-warning)]";

const neutralPillBase =
  "inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] font-medium text-[var(--text-2)]";

type PersonSemanticPillProps = {
  label: string | null | undefined;
  tone?: "accent" | "warning" | "neutral";
  size?: "xs" | "sm";
  className?: string;
};

export function PersonSemanticPill({
  label,
  tone = "accent",
  size = "xs",
  className,
}: PersonSemanticPillProps) {
  const normalized = normalizeOptionalPresentationLabel(label);
  if (!normalized) return null;

  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  const toneClass =
    tone === "warning" ? warningPillBase : tone === "neutral" ? neutralPillBase : semanticPillBase;

  return (
    <span
      className={cn(toneClass, sizeClass, className)}
      data-testid="person-semantic-pill"
    >
      {normalized}
    </span>
  );
}

export function PersonPresentationIconTile({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--sce-accent)_28%,transparent)] bg-[var(--sce-accent-subtle)] text-[var(--sce-accent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
