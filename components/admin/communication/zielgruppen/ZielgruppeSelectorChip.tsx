"use client";

import { X } from "lucide-react";

type Props = {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
};

export default function ZielgruppeSelectorChip({ label, onRemove, disabled }: Props) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
      <span className="truncate">{label}</span>
      <button
        type="button"
        disabled={disabled}
        className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--blue)]"
        aria-label={`${label} entfernen`}
        onClick={onRemove}
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}
