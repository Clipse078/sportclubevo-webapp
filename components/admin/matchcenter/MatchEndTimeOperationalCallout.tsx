import Link from "next/link";
import { CircleAlert } from "lucide-react";
import {
  getMatchEndTimeCorrectionHref,
  MATCH_END_TIME_ACTION_LABEL,
  MATCH_END_TIME_MISSING_COPY,
  MATCH_END_TIME_MISSING_HEADLINE,
} from "@/lib/match/match-operational-completeness";

type MatchEndTimeOperationalCalloutProps = {
  matchId: string;
  requiresEndTimeAction: boolean;
  canManage: boolean;
  canReschedule: boolean;
};

export default function MatchEndTimeOperationalCallout({
  matchId,
  requiresEndTimeAction,
  canManage,
  canReschedule,
}: MatchEndTimeOperationalCalloutProps) {
  if (!requiresEndTimeAction) return null;

  const showEditLink = canManage && canReschedule;

  return (
    <div
      className="fca-status-box fca-status-box-warning flex gap-3"
      data-testid="matchcenter-end-time-callout"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {MATCH_END_TIME_MISSING_HEADLINE}
          </p>
          <p className="text-sm text-[var(--text-2)]">{MATCH_END_TIME_MISSING_COPY}</p>
        </div>
        {showEditLink ? (
          <Link
            href={getMatchEndTimeCorrectionHref(matchId)}
            className="inline-flex text-sm font-semibold text-amber-800 hover:underline"
          >
            {MATCH_END_TIME_ACTION_LABEL}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
