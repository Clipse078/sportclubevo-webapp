import { cn } from "@/lib/cn";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  className?: string;
  testId?: string;
};

/**
 * Native time input with SCE dark-surface styling (HH:MM, keyboard accessible).
 */
export function SceTimeField({
  id,
  value,
  onChange,
  disabled,
  required,
  "aria-label": ariaLabel,
  className,
  testId,
}: Props) {
  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        "min-w-[7rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]",
        "[color-scheme:dark]",
        "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sce-primary)_35%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}
