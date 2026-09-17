"use client";

import { useId } from "react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";

export type VeranstaltungAusspielungValues = {
  websiteVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
};

type VeranstaltungAusspielungFieldsProps = {
  values: VeranstaltungAusspielungValues;
  onChange: (patch: Partial<VeranstaltungAusspielungValues>) => void;
  disabled?: boolean;
};

type AusspielungRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  switchDisabled?: boolean;
  descriptionWhenDisabled?: string;
};

function AusspielungRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  switchDisabled,
  descriptionWhenDisabled,
}: AusspielungRowProps) {
  const switchId = useId();
  const controlDisabled = disabled || switchDisabled;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3",
        "border-b border-[var(--border)] last:border-b-0",
        controlDisabled && switchDisabled ? "opacity-80" : "",
      )}
      data-testid={`ausspielung-row-${label.toLowerCase()}`}
    >
      <div className="min-w-0 flex-1">
        <label
          htmlFor={switchId}
          className={cn(
            "block text-sm font-medium text-[var(--foreground)]",
            controlDisabled ? "cursor-default" : "cursor-pointer",
          )}
        >
          {label}
        </label>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {switchDisabled && descriptionWhenDisabled
            ? descriptionWhenDisabled
            : description}
        </p>
      </div>
      <SwitchThumb
        id={switchId}
        checked={checked}
        onChange={onChange}
        disabled={controlDisabled}
        aria-label={label}
      />
    </div>
  );
}

/**
 * Shared Ausspielung controls for Veranstaltung create/edit.
 * Infoboard is operational (automatic) — not configured here.
 */
export default function VeranstaltungAusspielungFields({
  values,
  onChange,
  disabled,
}: VeranstaltungAusspielungFieldsProps) {
  const homepageSwitchDisabled = !values.websiteVisible;

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4"
      aria-labelledby="veranstaltung-ausspielung-heading"
      data-testid="veranstaltung-ausspielung"
    >
      <h3
        id="veranstaltung-ausspielung-heading"
        className="fca-label border-b border-[var(--border)] py-3"
      >
        Ausspielung
      </h3>

      <AusspielungRow
        label="Website"
        description="Auf der Vereinswebsite anzeigen"
        checked={values.websiteVisible}
        onChange={(checked) => onChange({ websiteVisible: checked })}
        disabled={disabled}
      />

      <AusspielungRow
        label="Homepage"
        description="Zusätzlich auf der Startseite anzeigen"
        checked={values.homepageVisible}
        onChange={(checked) => onChange({ homepageVisible: checked })}
        disabled={disabled}
        switchDisabled={homepageSwitchDisabled}
        descriptionWhenDisabled="Website muss aktiviert sein"
      />

      <AusspielungRow
        label="Wochenplan"
        description="Im öffentlichen Wochenplan anzeigen"
        checked={values.wochenplanVisible}
        onChange={(checked) => onChange({ wochenplanVisible: checked })}
        disabled={disabled}
      />
    </section>
  );
}
