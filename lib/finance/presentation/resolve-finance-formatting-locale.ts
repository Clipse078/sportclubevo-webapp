import {
  resolveFormattingLocale,
  type TenantFormatConfig,
} from "@/lib/tenant-runtime/formatters";

/**
 * Finance surfaces use tenant formatting locale — not next-intl translation locale (`de`).
 */
export function resolveFinanceFormattingLocale(
  tenant: Pick<TenantFormatConfig, "locale">,
): string {
  return resolveFormattingLocale(tenant);
}
