"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ParticipationResponseStatus } from "@prisma/client";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import type { TrainingSessionParticipantDto } from "@/lib/training/training-session-participants";

const INITIAL_PLAYER_ROWS = 12;

type Props = {
  participants: TrainingSessionParticipantDto[];
};

function ParticipantStatusBadge({
  status,
  label,
}: {
  status: ParticipationResponseStatus;
  label: string;
}) {
  return (
    <span
      className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
      data-testid={`training-session-participant-status-${status.toLowerCase()}`}
    >
      {label}
    </span>
  );
}

function ParticipantRow({
  participant,
  roleLabel,
  statusLabel,
}: {
  participant: TrainingSessionParticipantDto;
  roleLabel?: string;
  statusLabel?: string;
}) {
  return (
    <li
      className="flex min-w-0 items-center gap-2 py-1.5"
      data-testid={`training-session-participant-row-${participant.personId}`}
    >
      <div className="shrink-0 scale-[0.64] origin-left">
        <AdminAvatar name={participant.displayName} imageSrc={participant.avatarUrl} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--foreground)]">{participant.displayName}</p>
        {roleLabel ? (
          <p className="truncate text-[10px] text-[var(--muted)]">{roleLabel}</p>
        ) : null}
      </div>
      {participant.participationStatus && statusLabel ? (
        <ParticipantStatusBadge status={participant.participationStatus} label={statusLabel} />
      ) : null}
    </li>
  );
}

export function TrainingSessionParticipantsPanel({ participants }: Props) {
  const t = useTranslations("TrainingCenter.sessionEdit");
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const trainers = useMemo(
    () => participants.filter((p) => p.role === "TRAINER"),
    [participants],
  );
  const players = useMemo(
    () => participants.filter((p) => p.role === "PLAYER"),
    [participants],
  );

  const visiblePlayers = showAllPlayers ? players : players.slice(0, INITIAL_PLAYER_ROWS);
  const hiddenPlayerCount = Math.max(0, players.length - INITIAL_PLAYER_ROWS);

  const statusLabel = (status: ParticipationResponseStatus) =>
    t(`participationStatus.${status}` as "participationStatus.OPEN");

  return (
    <div className="space-y-3" data-testid="training-session-participants-panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="training-session-edit-participants-heading"
          className="text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          {t("participantsHeading")}
        </h2>
        <p className="text-xs text-[var(--text-2)]" data-testid="training-session-participants-count">
          {t("participantsCount", { count: participants.length })}
        </p>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]" data-testid="training-session-participants-empty">
          {t("participantsEmpty")}
        </p>
      ) : (
        <div className="space-y-3">
          {trainers.length > 0 ? (
            <section aria-labelledby="training-session-participants-trainers-label">
              <h3
                id="training-session-participants-trainers-label"
                className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                {t("participantsTrainers")}
              </h3>
              <ul className="divide-y divide-[var(--border)]/60">
                {trainers.map((trainer) => (
                  <ParticipantRow
                    key={trainer.personId}
                    participant={trainer}
                    roleLabel={trainer.trainerRoleLabel ?? t("participantsTrainerRole")}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {players.length > 0 ? (
            <section aria-labelledby="training-session-participants-players-label">
              <h3
                id="training-session-participants-players-label"
                className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                {t("participantsPlayers")}
              </h3>
              <ul className="divide-y divide-[var(--border)]/60">
                {visiblePlayers.map((player) => (
                  <ParticipantRow
                    key={player.personId}
                    participant={player}
                    statusLabel={
                      player.participationStatus
                        ? statusLabel(player.participationStatus)
                        : undefined
                    }
                  />
                ))}
              </ul>
              {!showAllPlayers && hiddenPlayerCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllPlayers(true)}
                  className="mt-2 inline-flex rounded-md px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                  data-testid="training-session-participants-show-all"
                  aria-expanded={false}
                >
                  {t("participantsShowAll", { count: players.length })}
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
