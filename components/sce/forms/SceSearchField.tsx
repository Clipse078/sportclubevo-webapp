"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SCE_SEARCH_FIELD_INPUT_CLASS,
  SCE_SEARCH_FIELD_INPUT_WITH_CLEAR_CLASS,
  SCE_SEARCH_FIELD_MARKERS,
} from "@/lib/design-system/sce-form-control-foundation";
import { SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_SIZE_CLASS } from "@/lib/design-system/sce-form-control-micro-ux";

export type SceSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  name?: string;
  testId?: string;
  className?: string;
  shellClassName?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** When true, uses native `defaultValue` + uncontrolled onChange from parent (URL filters). */
  defaultValue?: string;
};

/**
 * Canonical SCE list/admin search control — icon, placeholder, optional clear.
 */
export function SceSearchField({
  value,
  onChange,
  placeholder = "Suchen…",
  ariaLabel = "Suche",
  id,
  name,
  testId = "sce-search-field",
  className,
  shellClassName,
  disabled = false,
  clearable = true,
  defaultValue,
}: SceSearchFieldProps) {
  const showClear = clearable && (value.trim().length > 0 || (defaultValue?.trim().length ?? 0) > 0);

  return (
    <div
      className={cn("relative min-w-0 flex-1", shellClassName)}
      data-testid={`${testId}-shell`}
      data-sce-search-field="true"
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-2)]",
          SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_SIZE_CLASS,
        )}
        aria-hidden
        {...{ [SCE_SEARCH_FIELD_MARKERS.leadingIcon]: "true" }}
      />
      <input
        type="search"
        id={id}
        name={name}
        value={defaultValue === undefined ? value : undefined}
        defaultValue={defaultValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        data-testid={testId}
        autoComplete="off"
        className={cn(
          "w-full text-sm",
          showClear ? SCE_SEARCH_FIELD_INPUT_WITH_CLEAR_CLASS : SCE_SEARCH_FIELD_INPUT_CLASS,
          className,
        )}
      />
      {showClear && !disabled ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-color-focus)]"
          aria-label="Suche löschen"
          data-testid={`${testId}-clear`}
          {...{ [SCE_SEARCH_FIELD_MARKERS.trailingClear]: "true" }}
          onClick={() => onChange("")}
        >
          <X className={SCE_FORM_CONTROL_MICRO_UX_SEARCH_ICON_SIZE_CLASS} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
