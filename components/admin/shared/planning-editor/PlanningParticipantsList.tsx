"use client";

import { useState } from "react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import MatchAvailabilityStatusBadge from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import ActivityPlayerReleaseButton from "@/components/admin/teams/ActivityPlayerReleaseButton";
import type { PlanningParticipantRow } from "@/lib/planning/planning-participant-types";
import { useTranslations } from "next-intl";

const INITIAL_VISIBLE = 12;

export type PlanningParticipantReleaseContext = {
  teamId: string;
  teamSeasonId: string;
  canManageRelease: boolean;
  releaseReadOnly?: boolean;
  activity:
    | { kind: "EVENT"; eventId: string; scopeLabel: string }
    | { kind: "TRAINING"; trainingSessionId: string; scopeLabel: string };
};

type Props = {
  people: PlanningParticipantRow[];
  teams?: PlanningParticipantRow[];
  testId?: string;
  releaseContext?: PlanningParticipantReleaseContext;
};

function ParticipantRow({
  row,
  releaseContext,
}: {
  row: PlanningParticipantRow;
  releaseContext?: PlanningParticipantReleaseContext;
}) {
  const showRelease =
    releaseContext &&
    row.role === "PLAYER" &&
    releaseContext.canManageRelease;

  return (
    <li
      className="flex min-w-0 flex-wrap items-center gap-2 py-1.5 sm:flex-nowrap"
      data-testid={`planning-participant-row-${row.id}`}
    >
      <div className="shrink-0 scale-[0.64] origin-left">
        <AdminAvatar name={row.displayName} imageSrc={row.avatarUrl} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--foreground)]">{row.displayName}</p>
        {row.roleLabel || row.subLabel ? (
          <p className="truncate text-[10px] text-[var(--muted)]">
            {[row.roleLabel, row.subLabel].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      {row.participationStatusLabel ? (
        row.participationStatusTone ? (
          <MatchAvailabilityStatusBadge
            label={row.participationStatusLabel}
            tone={row.participationStatusTone}
            icon={row.participationStatusIcon ?? "circle"}
            testId={`planning-participant-status-${row.id}`}
          />
        ) : (
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
            {row.participationStatusLabel}
          </span>
        )
      ) : null}
      {showRelease ? (
        <ActivityPlayerReleaseButton
          teamId={releaseContext.teamId}
          teamSeasonId={releaseContext.teamSeasonId}
          personId={row.id}
          personDisplayName={row.displayName}
          canManage={releaseContext.canManageRelease}
          disabled={releaseContext.releaseReadOnly}
          activityContext={{
            mode: "ACTIVITY",
            eventId:
              releaseContext.activity.kind === "EVENT"
                ? releaseContext.activity.eventId
                : undefined,
            trainingSessionId:
              releaseContext.activity.kind === "TRAINING"
                ? releaseContext.activity.trainingSessionId
                : undefined,
            scopeLabel: releaseContext.activity.scopeLabel,
          }}
          testId={`planning-participant-release-${row.id}`}
        />
      ) : null}
    </li>
  );
}

export default function PlanningParticipantsList({
  people,
  teams = [],
  testId = "planning-participants-list",
  releaseContext,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.participants");
  const [showAll, setShowAll] = useState(false);

  const visiblePeople = showAll ? people : people.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, people.length - INITIAL_VISIBLE);

  return (
    <div className="space-y-4" data-testid={testId}>
      {teams.length > 0 ? (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("teamsHeading")}
          </h3>
          <ul className="divide-y divide-[var(--border)]/50">
            {teams.map((team) => (
              <ParticipantRow key={team.id} row={team} />
            ))}
          </ul>
        </div>
      ) : null}

      {people.length > 0 ? (
        <div>
          {teams.length > 0 ? (
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("peopleHeading")}
            </h3>
          ) : null}
          <ul className="divide-y divide-[var(--border)]/50">
            {visiblePeople.map((person) => (
              <ParticipantRow
                key={person.id}
                row={person}
                releaseContext={releaseContext}
              />
            ))}
          </ul>
          {hiddenCount > 0 && !showAll ? (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-[var(--sce-primary)] hover:underline"
              aria-expanded={showAll}
              onClick={() => setShowAll(true)}
              data-testid="planning-participants-show-all"
            >
              {t("showAll", { count: people.length })}
            </button>
          ) : null}
        </div>
      ) : teams.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="planning-participants-empty">
          {t("empty")}
        </p>
      ) : null}
    </div>
  );
}
