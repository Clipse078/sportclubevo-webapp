"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import StaticOptionSearchablePicker from "@/components/admin/shared/StaticOptionSearchablePicker";
import { buildIso4217CurrencyPickerOptions } from "@/lib/finance/currency/iso4217-currency";

type FinanceBaseCurrencySelectorProps = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  placeholder: string;
  testId?: string;
};

export function FinanceBaseCurrencySelector({
  value,
  onChange,
  disabled,
  ariaLabel,
  placeholder,
  testId = "finance-base-currency",
}: FinanceBaseCurrencySelectorProps) {
  const locale = useLocale();
  const options = useMemo(
    () => buildIso4217CurrencyPickerOptions(locale),
    [locale],
  );

  return (
    <div
      className="min-w-0 max-w-full sm:min-w-[16rem] sm:max-w-md [&_.fca-combobox-input]:bg-[var(--surface-2)]"
      data-finance-control="base-currency-selector"
    >
      <StaticOptionSearchablePicker
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        testId={testId}
      />
    </div>
  );
}
