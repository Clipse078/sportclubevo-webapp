"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { SceDateTile } from "@/components/design-system/date";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { MeetingLiveData } from "@/lib/meetings/queries";
import MeetingProtocolApprovalSection from "@/components/admin/meetings/approval/MeetingProtocolApprovalSection";
import MeetingGovernanceBanner from "@/components/admin/meetings/MeetingGovernanceBanner";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(date));
}

type Props = {
  meeting: MeetingLiveData;
  slug: string;
  canManage: boolean;
  actorPersonId: string | null;
  approvalWorkspaceData: MeetingApprovalWorkspaceData;
  fmtCfg: TenantFormatConfig;
};

export default function MeetingWorkspaceDetailsSection({
  meeting,
  slug,
  canManage,
  actorPersonId,
  approvalWorkspaceData,
  fmtCfg,
}: Props) {
  return (
    <div className="space-y-4" data-testid="meeting-section-sitzungsdetails">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Sitzungsdetails</h3>
          {canManage ? (
            <Link
              href={`/vereinsleitung/meetings/${slug}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Bearbeiten
            </Link>
          ) : null}
        </div>
        <MeetingDetailsGrid meeting={meeting} fmtCfg={fmtCfg} />
      </section>

      <MeetingGovernanceBanner meeting={meeting} />

      <MeetingProtocolApprovalSection
        meeting={meeting}
        canManage={canManage}
        actorPersonId={actorPersonId}
        approvalData={approvalWorkspaceData}
      />
    </div>
  );
}

function MeetingDetailsGrid({
  meeting,
  fmtCfg,
}: {
  meeting: MeetingLiveData;
  fmtCfg: TenantFormatConfig;
}) {
  return (
    <dl className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
      <SceDateTile
        value={meeting.meetingDate}
        fmtCfg={fmtCfg}
        size="default"
        testId="meeting-details-date-tile"
      />
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Zeit</dt>
          <dd className="font-medium text-[var(--foreground)]">
            {formatTime(meeting.meetingDate, fmtCfg.timezone ?? "Europe/Zurich")} Uhr
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Ort</dt>
          <dd className="font-medium text-[var(--foreground)]">{meeting.location ?? "—"}</dd>
        </div>
        {meeting.plannedDurationMin ? (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Geplante Dauer
            </dt>
            <dd className="font-medium text-[var(--foreground)]">{meeting.plannedDurationMin} Min.</dd>
          </div>
        ) : null}
        {meeting.description ? (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Beschreibung
            </dt>
            <dd className="text-[var(--text-2)]">{meeting.description}</dd>
          </div>
        ) : null}
      </div>
    </dl>
  );
}
