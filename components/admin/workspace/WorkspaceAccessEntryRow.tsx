"use client";

import {
  Building2,
  Shield,
  User,
  Users,
  UserSquare2,
} from "lucide-react";

import type { WorkspaceEffectiveAccessEntryDto } from "@/lib/workspace/access/access-management-dto";
import { audienceKindLabelDe } from "@/lib/workspace/access/access-management-labels";

type WorkspaceAccessEntryRowProps = {
  entry: WorkspaceEffectiveAccessEntryDto;
  multiplePathsLabel: (count: number) => string;
  configuredLevelLabel: string;
  effectiveLevelLabel: string;
  inheritedBadgeLabel: string;
};

function audienceIcon(kind: WorkspaceEffectiveAccessEntryDto["audienceKind"]) {
  switch (kind) {
    case "ORGANISATION":
      return Building2;
    case "ORG_UNIT":
      return Users;
    case "TEAM":
      return UserSquare2;
    case "ROLE":
      return Shield;
    case "PERSON":
      return User;
    default:
      return User;
  }
}

export function WorkspaceAccessEntryRow({
  entry,
  multiplePathsLabel,
  configuredLevelLabel,
  effectiveLevelLabel,
  inheritedBadgeLabel,
}: WorkspaceAccessEntryRowProps) {
  const Icon = audienceIcon(entry.audienceKind);
  const kindLabel = audienceKindLabelDe(entry.audienceKind);

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 font-medium text-[var(--text)]">
            <Icon
              className="h-4 w-4 shrink-0 text-[var(--muted)]"
              aria-hidden="true"
            />
            <span className="min-w-0 break-words">
              <span className="text-[var(--muted)]">{kindLabel}</span> ·{" "}
              {entry.audienceLabel}
            </span>
          </p>
          <p className="mt-1 text-sm text-[var(--text)]">
            {entry.effectiveLevelLabel}
          </p>
          <p className="mt-1 text-xs text-[var(--text-2)]">{entry.whyLabel}</p>
          {entry.configuredLevelLabel ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {configuredLevelLabel}: {entry.configuredLevelLabel} ·{" "}
              {effectiveLevelLabel}: {entry.effectiveLevelLabel}
              {entry.ancestorCapLabel ? ` — ${entry.ancestorCapLabel}` : null}
            </p>
          ) : entry.ancestorCapLabel ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {entry.ancestorCapLabel}
            </p>
          ) : null}
          {entry.pathCount > 1 ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {multiplePathsLabel(entry.pathCount)}
            </p>
          ) : null}
        </div>
        {entry.isInherited ? (
          <span className="shrink-0 rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {inheritedBadgeLabel}
          </span>
        ) : null}
      </div>
    </li>
  );
}
