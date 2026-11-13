"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Users } from "lucide-react";
import { SceDateTile } from "@/components/design-system/date";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import {
  getMeetingLifecyclePresentation,
  getMeetingPrimaryAction,
} from "@/lib/meetings/meeting-lifecycle";
import { protocolReviewStageStatusLabel } from "@/lib/meetings/meeting-approval-presentation";

type Props = {
  title: string;
  meeting: MeetingLiveData;
  slug: string;
  canManage: boolean;
  fmtCfg: TenantFormatConfig;
  agendaCount: number;
  participantCount: number;
  decisionCount: number;
  actionCount: number;
  pendingDecisionApprovals: number;
  hasInvitedParticipants?: boolean;
  onNavigateToSection?: (sectionId: string) => void;
};

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(date));
}

export default function MeetingWorkspaceHeader({
  title,
  meeting,
  slug,
  canManage,
  fmtCfg,
  agendaCount,
  participantCount,
  decisionCount,
  actionCount,
  pendingDecisionApprovals,
  hasInvitedParticipants,
  onNavigateToSection,
}: Props) {
  const router = useRouter();
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const lifecycle = getMeetingLifecyclePresentation({
    status: meeting.status ?? "PLANNED",
    meetingDate: meeting.meetingDate,
    participantCount,
    agendaCount,
    decisionCount,
    actionCount,
    hasInvitedParticipants,
    conductedAt: meeting.conductedAt,
    reviewStage: meeting.reviewStage,
    protocolApprovalRequired: meeting.protocolApprovalRequired,
  });

  const primary = getMeetingPrimaryAction({
    status: meeting.status ?? "PLANNED",
    meetingDate: meeting.meetingDate,
    participantCount,
    agendaCount,
    decisionCount,
    actionCount,
    hasInvitedParticipants,
    conductedAt: meeting.conductedAt,
  });

  const protocolSummary = meeting.protocolApprovalRequired
    ? protocolReviewStageStatusLabel(meeting.reviewStage, true)
    : null;

  async function handlePrimaryAction() {
    if (primary.lifecycleAction && canManage) {
      setLifecycleError(null);
      setLifecycleLoading(true);
      try {
        const res = await fetch(`/api/meetings/${meeting.id}/lifecycle`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: primary.lifecycleAction }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLifecycleError((data as { error?: string }).error ?? "Aktion fehlgeschlagen.");
          return;
        }
        router.refresh();
      } catch {
        setLifecycleError("Netzwerkfehler.");
      } finally {
        setLifecycleLoading(false);
      }
      return;
    }
    if (!primary.targetSectionId) return;
    if (onNavigateToSection) {
      onNavigateToSection(primary.targetSectionId);
      return;
    }
    const el = document.getElementById(primary.targetSectionId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const showPrimary =
    canManage && (primary.lifecycleAction !== undefined || primary.targetSectionId !== null);

  return (
    <header className="space-y-3" data-testid="meeting-workspace-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <SceDateTile
            value={meeting.meetingDate}
            fmtCfg={fmtCfg}
            size="default"
            testId="meeting-header-date-tile"
          />
          <span className="text-[0.65rem] font-medium tabular-nums text-[var(--foreground)]">
            {formatTime(meeting.meetingDate, fmtCfg.timezone ?? "Europe/Zurich")} Uhr
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <MeetingHeaderTitleBlock title={title} lifecycleLabel={lifecycle.lifecycleLabel} />
            {showPrimary ? (
              <button
                type="button"
                onClick={() => void handlePrimaryAction()}
                disabled={lifecycleLoading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0b4aa2] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#093d87] disabled:opacity-50"
                data-testid="meeting-primary-action"
              >
                {lifecycleLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {primary.label}
              </button>
            ) : null}
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-2)]">
            <li className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
              {meeting.location ?? "Kein Ort angegeben"}
            </li>
            <li className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
              {participantCount} Teilnehmer
            </li>
          </ul>

          {canManage ? (
            <p className="text-[11px] text-[var(--muted)]">
              <Link
                href={`/vereinsleitung/meetings/${slug}/edit`}
                className="font-semibold text-[#0b4aa2]"
              >
                Stammdaten bearbeiten
              </Link>
            </p>
          ) : null}
          {lifecycleError ? (
            <p className="text-xs text-rose-600" role="alert">
              {lifecycleError}
            </p>
          ) : null}
        </div>
      </div>

      <dl
        className="flex flex-wrap gap-2 text-xs"
        data-testid="meeting-workspace-status-chips"
      >
        <StatusChip label="Sitzung" value={lifecycle.lifecycleLabel} />
        {protocolSummary ? (
          <StatusChip label="Protokollfreigabe" value={protocolSummary} />
        ) : (
          <StatusChip label="Protokollfreigabe" value="Nicht erforderlich" muted />
        )}
        <StatusChip
          label="Beschlüsse"
          value={
            pendingDecisionApprovals > 0
              ? `${pendingDecisionApprovals} zur Freigabe`
              : decisionCount > 0
                ? `${decisionCount} erfasst`
                : "Keine"
          }
        />
      </dl>
    </header>
  );
}

function StatusChip({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={
        muted
          ? "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[var(--text-2)]"
          : "inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[var(--foreground)]"
      }
    >
      <span className="font-medium text-[var(--muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function MeetingHeaderTitleBlock({
  title,
  lifecycleLabel,
}: {
  title: string;
  lifecycleLabel: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
        {title}
      </p>
      <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-2)]">
        {lifecycleLabel}
      </span>
    </div>
  );
}
