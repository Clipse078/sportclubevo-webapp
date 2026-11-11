"use client";

import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Pencil } from "lucide-react";
import type { MeetingLiveData } from "@/lib/meetings/queries";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Geplant",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

const STATUS_CLASS: Record<string, string> = {
  PLANNED: "border-[#0b4aa2]/20 bg-[#0b4aa2]/10 text-[#0b4aa2]",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-slate-200 bg-slate-100 text-[var(--text-2)]",
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
};

export default function MeetingWorkspaceHeader({
  meeting,
  slug,
  canManage,
  agendaCount,
  participantCount,
}: Props) {
  const status = meeting.status ?? "PLANNED";
  const nextHint =
    status === "COMPLETED"
      ? "Sitzung abgeschlossen — Massnahmen und Aufgaben nachverfolgen."
      : agendaCount === 0
        ? "Als Nächstes: Traktanden erfassen."
        : participantCount === 0
          ? "Als Nächstes: Teilnehmer einladen."
          : "Bereit zur Durchführung oder Protokollpflege.";

  return (
    <header
      className="rounded-[30px] border border-slate-200/80 bg-[var(--surface-2)] p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
      data-testid="meeting-workspace-header"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status] ?? STATUS_CLASS.PLANNED}`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
            <p className="text-sm text-[var(--text-2)]">{nextHint}</p>
          </div>
          {meeting.description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-2)]">{meeting.description}</p>
          ) : null}
        </div>
        {canManage ? (
          <Link
            href={`/vereinsleitung/meetings/${slug}/edit`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Stammdaten bearbeiten
          </Link>
        ) : null}
      </div>

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
