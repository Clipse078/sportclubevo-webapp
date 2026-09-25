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
  /** When true, render rows only (inside PlanningPublicationPanel). */
  embedded?: boolean;
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

function PublicationRows({
  rows,
  values,
  onChange,
  disabled,
  formFieldPrefix,
}: Omit<PlannerEntryPublicationFieldsProps, "embedded">) {
  return (
    <>
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
    </>
  );
}

export default function PlannerEntryPublicationFields({
  rows,
  values,
  onChange,
  disabled,
  formFieldPrefix = "",
  embedded = false,
}: PlannerEntryPublicationFieldsProps) {
  if (embedded) {
    return (
      <div className="px-3 md:px-4" data-testid="planner-publication-section">
        <PublicationRows
          rows={rows}
          values={values}
          onChange={onChange}
          disabled={disabled}
          formFieldPrefix={formFieldPrefix}
        />
      </div>
    );
  }

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

      <PublicationRows
        rows={rows}
        values={values}
        onChange={onChange}
        disabled={disabled}
        formFieldPrefix={formFieldPrefix}
      />
    </section>
  );
}
