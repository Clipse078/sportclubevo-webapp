"use client";

import type { ReactNode } from "react";
import VereinsentwicklungOrgEinheitFilterChip from "./VereinsentwicklungOrgEinheitFilterChip";

export type VereinsentwicklungWorkspaceToolbarProps = {
  orgEinheitFilterLabel?: string | null;
  filters?: ReactNode;
  primaryAction?: ReactNode;
  testId?: string;
};

/** Compact toolbar directly below connected-workspace tabs (Übersicht baseline). */
export default function VereinsentwicklungWorkspaceToolbar({
  orgEinheitFilterLabel = null,
  filters,
  primaryAction,
  testId = "vereinsentwicklung-workspace-toolbar",
}: VereinsentwicklungWorkspaceToolbarProps) {
  const hasLeft = Boolean(orgEinheitFilterLabel) || Boolean(filters);
  const hasRight = Boolean(primaryAction);
  if (!hasLeft && !hasRight) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3"
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {orgEinheitFilterLabel ? (
          <VereinsentwicklungOrgEinheitFilterChip label={orgEinheitFilterLabel} />
        ) : null}
        {filters}
      </div>
      {primaryAction ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{primaryAction}</div>
      ) : null}
    </div>
  );
}