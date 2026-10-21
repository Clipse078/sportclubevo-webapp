import {
  EventsSceIcon,
  RequirementsSceIcon,
  TasksSceIcon,
} from "@/components/icons/domain-sce-icon-components";
import { AUFGABEN_PERSONAL_ACTION_TYPE_DISPLAY } from "@/lib/aufgaben/action-type-semantics";
import { cn } from "@/lib/cn";
import { SceDenseMetaChip } from "@/components/sce/dense/SceDenseMetaChip";

const LEGEND_ITEMS = [
  {
    key: "AUFGABE",
    Icon: TasksSceIcon,
    chipClass:
      "border-[var(--sce-warning)]/35 bg-[var(--sce-warning)]/10 text-[var(--sce-warning)]",
  },
  {
    key: "TEILNAHME",
    Icon: EventsSceIcon,
    chipClass:
      "border-[var(--sce-primary)]/35 bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]",
  },
  {
    key: "ANFORDERUNG",
    Icon: RequirementsSceIcon,
    chipClass:
      "border-[var(--sce-success)]/30 bg-[var(--sce-success)]/10 text-[var(--sce-success)]",
  },
] as const;

type Props = {
  className?: string;
};

/**
 * Restrained three-type mental model for Meine Aufgaben (DS-10 R4.3).
 */
export default function AufgabenPersonalActionTypeLegend({ className }: Props) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/60 px-3 py-2.5",
        className,
      )}
      data-testid="aufgaben-personal-action-type-legend"
      aria-label="Aktionstypen in Meine Aufgaben"
    >
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted)]">
        Dein Posteingang — drei Aktionstypen
      </p>
      <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
        {LEGEND_ITEMS.map(({ key, Icon, chipClass }) => {
          const copy = AUFGABEN_PERSONAL_ACTION_TYPE_DISPLAY[key];
          return (
            <li key={key} className="flex min-w-0 items-start gap-2">
              <Icon size={16} className="mt-0.5 shrink-0 text-[var(--muted)]" aria-hidden />
              <div className="min-w-0 space-y-0.5">
                <SceDenseMetaChip
                  label={copy.label}
                  className={chipClass}
                  testId={`aufgaben-legend-type-${key.toLowerCase()}`}
                />
                <p className="text-xs text-[var(--text-2)]">{copy.tagline}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
