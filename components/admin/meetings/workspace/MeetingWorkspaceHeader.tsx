"use client";

import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Pencil } from "lucide-react";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import {
  getMeetingLifecyclePresentation,
  getMeetingPrimaryAction,
} from "@/lib/meetings/meeting-lifecycle";

const STATUS_CLASS: Record<string, string> = {
  Entwurf: "border-slate-200 bg-slate-100 text-slate-700",
  Geplant: "border-[#0b4aa2]/20 bg-[#0b4aa2]/10 text-[#0b4aa2]",
  Eingeladen: "border-sky-200 bg-sky-50 text-sky-800",
  Durchgeführt: "border-indigo-200 bg-indigo-50 text-indigo-800",
  Abgeschlossen: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Abgesagt: "border-slate-200 bg-slate-100 text-[var(--text-2)]",
  "Protokollentwurf": "border-slate-200 bg-slate-50 text-slate-700",
  "Zur Freigabe": "border-amber-200 bg-amber-50 text-amber-800",
  "Änderungen angefordert": "border-rose-200 bg-rose-50 text-rose-800",
  Genehmigt: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function formatSwissDate(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

type Props = {
  meeting: MeetingLiveData;
  slug: string;
  canManage: boolean;
  agendaCount: number;
  participantCount: number;
  decisionCount: number;
  actionCount: number;
  hasInvitedParticipants?: boolean;
};

export default function MeetingWorkspaceHeader({
  meeting,
  slug,
  canManage,
  agendaCount,
  participantCount,
  decisionCount,
  actionCount,
  hasInvitedParticipants,
}: Props) {
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
  });

  const badgeClass = STATUS_CLASS[lifecycle.lifecycleLabel] ?? STATUS_CLASS.Geplant;

  return (
    <header
      className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
      data-testid="meeting-workspace-header"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}
            >
              {lifecycle.lifecycleLabel}
            </span>
            <p className="text-sm text-[var(--text-2)]">{lifecycle.lifecycleDetail}</p>
          </div>
          {meeting.description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">{meeting.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && primary.targetSectionId ? (
            <a
              href={`#${primary.targetSectionId}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0b4aa2] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#093d87]"
              data-testid="meeting-primary-action"
            >
              {primary.label}
            </a>
          ) : null}
          {canManage ? (
            <Link
              href={`/vereinsleitung/meetings/${slug}/edit`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Stammdaten
            </Link>
          ) : null}
        </div>
      </div>

      {canManage && primary.targetSectionId ? (
        <p className="mt-3 text-[12px] text-[var(--muted)]">{primary.description}</p>
      ) : null}

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 h-4 w-4 text-[#0b4aa2]" aria-hidden />
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Datum</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{formatSwissDate(meeting.meetingDate)}</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock3 className="mt-0.5 h-4 w-4 text-[#0b4aa2]" aria-hidden />
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Zeit</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{formatTime(meeting.meetingDate)} Uhr</dd>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 text-[#0b4aa2]" aria-hidden />
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Ort</dt>
            <dd className="text-sm font-medium text-[var(--foreground)]">{meeting.location ?? "—"}</dd>
          </div>
        </div>
      </dl>
    </header>
  );
}
