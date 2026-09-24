"use client";

import { useState } from "react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import type { PlanningParticipantRow } from "@/lib/planning/planning-participant-types";
import { useTranslations } from "next-intl";

const INITIAL_VISIBLE = 12;

type Props = {
  people: PlanningParticipantRow[];
  teams?: PlanningParticipantRow[];
  testId?: string;
};

function ParticipantRow({ row }: { row: PlanningParticipantRow }) {
  return (
    <li
      className="flex min-w-0 items-center gap-2 py-1.5"
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
        <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
          {row.participationStatusLabel}
        </span>
      ) : null}
    </li>
  );
}

export default function PlanningParticipantsList({ people, teams = [], testId = "planning-participants-list" }: Props) {
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
              <ParticipantRow key={person.id} row={person} />
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
