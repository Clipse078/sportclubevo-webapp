"use client";

import { useId } from "react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";
import type {
  PlannerPublicationRowConfig,
  PlannerPublicationValues,
} from "@/lib/planner/planner-entry-publication-config";

type PlannerEntryPublicationFieldsProps = {
  rows: PlannerPublicationRowConfig[];
  values: PlannerPublicationValues;
  onChange: (patch: Partial<PlannerPublicationValues>) => void;
  disabled?: boolean;
  /** Hidden inputs for server action (checkbox "on" semantics). */
  formFieldPrefix?: string;
};

function PublicationRow({
  row,
  checked,
  onChange,
  disabled,
  switchDisabled,
}: {
  row: PlannerPublicationRowConfig;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  switchDisabled?: boolean;
}) {
  const switchId = useId();
  const controlDisabled = disabled || switchDisabled;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3",
        "border-b border-[var(--border)] last:border-b-0",
        switchDisabled ? "opacity-90" : "",
      )}
      data-testid={`planner-publication-row-${row.key}`}
    >
      <div className="min-w-0 flex-1">
        <label
          htmlFor={switchId}
          className={cn(
            "block text-sm font-medium text-[var(--foreground)]",
            controlDisabled ? "cursor-default" : "cursor-pointer",
          )}
        >
          {row.label}
        </label>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {switchDisabled && row.requiresWebsite
            ? "Website muss aktiviert sein."
            : row.description}
        </p>
      </div>
      <SwitchThumb
        id={switchId}
        checked={checked}
        onChange={onChange}
        disabled={controlDisabled}
        aria-label={row.label}
      />
    </div>
  );
}

export default function PlannerEntryPublicationFields({
  rows,
  values,
  onChange,
  disabled,
  formFieldPrefix = "",
}: PlannerEntryPublicationFieldsProps) {
  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4"
      aria-labelledby="planner-publication-heading"
      data-testid="planner-publication-section"
    >
      <div className="border-b border-[var(--border)] py-3">
        <h2
          id="planner-publication-heading"
          className="text-sm font-semibold text-[var(--foreground)]"
        >
          Publikation
        </h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Steuere, wo dieser Eintrag veröffentlicht wird.
        </p>
      </div>

      {rows.map((row) => {
        const switchDisabled =
          Boolean(row.requiresWebsite) && !values.websiteVisible;
        const checked = values[row.key];

        return (
          <div key={row.key}>
            <PublicationRow
              row={row}
              checked={checked}
              onChange={(next) => onChange({ [row.key]: next })}
              disabled={disabled}
              switchDisabled={switchDisabled}
            />
            {/* Server actions use checkbox "on" semantics via hidden input */}
            {checked ? (
              <input
                type="hidden"
                name={`${formFieldPrefix}${row.key}`}
                value="on"
                data-testid={`planner-publication-hidden-${row.key}`}
              />
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
