import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";

type Props = {
  match: MatchcenterMatchDetail;
  locale: string;
  timezone: string;
};

function formatDateTime(value: Date | null, locale: string, timezone: string): string {
  if (!value) return "Nicht hinterlegt";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(value);
}

function formatTime(value: Date | null, locale: string, timezone: string): string {
  if (!value) return "Nicht hinterlegt";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(value);
}

function valueOrFallback(value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Nicht hinterlegt";
  }
  return String(value);
}

function DetailRow({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div
      className="grid gap-1 border-b border-[var(--border)] py-3 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-5"
      data-testid={testId}
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="break-words text-sm font-medium text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

export default function SpieleMatchRecordTechnicalDetails({ match, locale, timezone }: Props) {
  const sourceLabel =
    match.source.provider ?? match.source.externalSource ?? match.source.eventSource;

  return (
    <details
      className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 text-sm"
      data-testid="matchcenter-technical-details"
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-medium text-[var(--foreground)] marker:content-none [&::-webkit-details-marker]:hidden">
        Technische Details
      </summary>
      <div className="space-y-6 border-t border-[var(--border)] px-4 py-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Quelle</h3>
          <dl>
            <DetailRow label="Quelle" value={valueOrFallback(sourceLabel)} />
            <DetailRow label="Event-Quelle" value={valueOrFallback(match.source.eventSource)} />
            <DetailRow label="Externe ID" value={valueOrFallback(match.source.externalSourceId)} />
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Provider</h3>
          <dl>
            <DetailRow label="Liga" value={valueOrFallback(match.providerLeagueName)} />
            <DetailRow label="Division" value={valueOrFallback(match.providerDivisionName)} />
            <DetailRow label="Saison" value={valueOrFallback(match.providerSeasonName)} />
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Synchronisierung
          </h3>
          <dl>
            <DetailRow
              label="Details synchronisiert"
              value={formatDateTime(match.synchronization.detailSyncedAt, locale, timezone)}
              testId="matchcenter-detail-synced"
            />
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Freigabe</h3>
          <dl>
            <DetailRow label="Review-Status" value={valueOrFallback(match.reviewStage)} />
            <DetailRow
              label="Treffpunkt"
              value={formatTime(match.operational.meetingTime, locale, timezone)}
              testId="matchcenter-detail-meeting-time"
            />
            <DetailRow
              label="Bemerkungen"
              value={valueOrFallback(match.operational.remarks)}
              testId="matchcenter-detail-remarks"
            />
          </dl>
        </div>
      </div>
    </details>
  );
}
