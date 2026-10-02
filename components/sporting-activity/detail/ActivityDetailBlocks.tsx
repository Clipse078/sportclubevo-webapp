"use client";

import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { ClubIdentityDisplay } from "@/components/sporting-activity/ClubIdentityDisplay";
import { SportingActivityLocationLines } from "@/components/sporting-activity/SportingActivityLocationLines";
import type { SportingActivityDetailRouteTarget } from "@/lib/sporting-activity-detail/types";
import type { SportingActivityDetailParticipantTeam } from "@/lib/sporting-activity-detail/types";
import type { SportingActivityDetailScheduleParts } from "@/lib/sporting-activity-detail/detail-schedule";

const iconClass = "mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]";

export function ActivityDetailScheduleGroup({
  parts,
  className,
}: {
  parts: SportingActivityDetailScheduleParts;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)} data-testid="activity-detail-schedule">
      <div className="flex items-start gap-2.5">
        <Calendar className={iconClass} aria-hidden />
        <p className="text-[0.9375rem] font-medium leading-snug text-[var(--foreground)]">
          {parts.dateLine}
        </p>
      </div>
      {parts.timeLine ? (
        <div className="flex items-start gap-2.5">
          <Clock className={iconClass} aria-hidden />
          <p className="font-mono text-[0.9375rem] tabular-nums text-[var(--foreground)]">
            {parts.timeLine}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ActivityDetailLocationBlock({
  lines,
  routeTarget,
  showOrtLabel = false,
}: {
  lines: readonly string[];
  routeTarget?: SportingActivityDetailRouteTarget | null;
  showOrtLabel?: boolean;
}) {
  if (lines.length === 0 && !routeTarget) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="activity-detail-location">
      {lines.length > 0 ? (
        <div className="flex items-start gap-2.5">
          <MapPin className={iconClass} aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            {showOrtLabel ? (
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                Ort
              </p>
            ) : null}
            <SportingActivityLocationLines
              lines={lines}
              density="standard"
              className="!space-y-1 [&_p]:text-[0.9375rem] [&_p]:text-[var(--foreground)]"
            />
          </div>
        </div>
      ) : null}
      {routeTarget ? (
        <Link
          href={routeTarget.href}
          target="_blank"
          rel="noopener noreferrer"
          className="sce-link-primary inline-flex min-h-10 items-center pl-[1.625rem] text-[0.875rem] font-medium"
          data-testid="activity-detail-route-link"
        >
          {routeTarget.label}
        </Link>
      ) : null}
    </div>
  );
}

export function ActivityDetailTeamRow({
  participantTeam,
}: {
  participantTeam: SportingActivityDetailParticipantTeam;
}) {
  return (
    <ClubIdentityDisplay
      identity={participantTeam.identity}
      density="compact"
      truncate={false}
      nameClassName="text-[0.9375rem] font-medium"
    />
  );
}
