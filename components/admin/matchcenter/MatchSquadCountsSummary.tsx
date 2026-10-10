import MatchAvailabilityStatusBadge from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";

type Counts = {
  rosterTotal: number;
  available: number;
  unavailable: number;
  maybe: number;
  open: number;
  selected: number;
  conflicts: number;
};

export type MatchSquadAvailabilityFilter = "ALL" | "OPEN" | "MAYBE";

type Props = {
  counts: Counts;
  activeFilter?: MatchSquadAvailabilityFilter;
  onFilterChange?: (filter: MatchSquadAvailabilityFilter) => void;
};

function SummaryChip({
  label,
  value,
  tone,
  icon,
  onClick,
  pressed,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "warning" | "muted" | "default";
  icon: "check" | "x" | "help" | "circle";
  onClick?: () => void;
  pressed?: boolean;
}) {
  const chipTone =
    tone === "default"
      ? ("muted" as const)
      : tone;
  const content = (
    <MatchAvailabilityStatusBadge
      label={`${label} ${value}`}
      tone={chipTone}
      icon={icon}
      size="md"
    />
  );
  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
    >
      {content}
    </button>
  );
}

export default function MatchSquadCountsSummary({
  counts,
  activeFilter = "ALL",
  onFilterChange,
}: Props) {
  return (
    <div
      className="mb-4 flex flex-wrap gap-2"
      data-testid="match-squad-counts-summary"
    >
      <SummaryChip label="Kader" value={counts.rosterTotal} tone="default" icon="circle" />
      {counts.available > 0 ? (
        <SummaryChip label="Verfügbar" value={counts.available} tone="success" icon="check" />
      ) : null}
      {counts.unavailable > 0 ? (
        <SummaryChip label="Nicht verfügbar" value={counts.unavailable} tone="danger" icon="x" />
      ) : null}
      {counts.maybe > 0 ? (
        <SummaryChip label="Unsicher" value={counts.maybe} tone="warning" icon="help" />
      ) : null}
      {counts.open > 0 ? (
        <SummaryChip
          label="Offen"
          value={counts.open}
          tone="muted"
          icon="circle"
          onClick={
            onFilterChange
              ? () => onFilterChange(activeFilter === "OPEN" ? "ALL" : "OPEN")
              : undefined
          }
          pressed={activeFilter === "OPEN"}
        />
      ) : null}
      {counts.selected > 0 ? (
        <SummaryChip label="Aufgeboten" value={counts.selected} tone="default" icon="circle" />
      ) : null}
      {counts.conflicts > 0 ? (
        <SummaryChip label="Zu prüfen" value={counts.conflicts} tone="warning" icon="help" />
      ) : null}
    </div>
  );
}
