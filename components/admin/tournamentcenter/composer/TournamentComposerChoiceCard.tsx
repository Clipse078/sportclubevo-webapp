"use client";

import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  testId: string;
};

export default function TournamentComposerChoiceCard({
  title,
  description,
  selected,
  onSelect,
  testId,
}: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={testId}
      onClick={onSelect}
      className={cn(
        "flex min-h-[5.5rem] flex-col items-start rounded-xl border p-4 text-left transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-primary)]",
        selected
          ? "border-[var(--sce-primary)] bg-[var(--sce-primary-soft)]"
          : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--sce-primary-muted)]",
      )}
    >
      <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
      <span className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">{description}</span>
    </button>
  );
}
