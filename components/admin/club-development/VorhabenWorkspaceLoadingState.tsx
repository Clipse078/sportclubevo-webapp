"use client";

import { Loader2 } from "lucide-react";

type Props = {
  label?: string;
};

export default function VorhabenWorkspaceLoadingState({ label = "Arbeitsbereich wird geladen …" }: Props) {
  return (
    <div
      className="mb-3 flex items-center justify-center gap-2 py-2"
      role="status"
      aria-live="polite"
      data-testid="vorhaben-workspace-loading"
    >
      <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" aria-hidden />
      <span className="text-sm text-[var(--muted)]">{label}</span>
    </div>
  );
}