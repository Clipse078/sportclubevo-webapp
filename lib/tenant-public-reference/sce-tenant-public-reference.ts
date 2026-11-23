import type { Prisma } from "@prisma/client";
import { scePublicReferenceFromNumber } from "@/lib/club-development/sce-public-reference";

export const TENANT_PUBLIC_REFERENCE_CODE_PATTERN = /^[A-Z0-9]{2,12}$/;

/** Reserved for legacy global SCE-… references; must not be used as a tenant code. */
export const TENANT_PUBLIC_REFERENCE_RESERVED_SHORT_CODES = new Set(["SCE"]);

const TENANT_PUBLIC_REFERENCE_PARSE_PATTERN = /^([A-Za-z0-9]{2,12})-(\d+)$/;

const TENANT_PUBLIC_NUMBER_MIN = BigInt(1);
const TENANT_PUBLIC_NUMBER_MAX = BigInt("9223372036854775807");

export function normalizeTenantPublicReferenceShortCode(
  input: string | null | undefined,
): string | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (
    !TENANT_PUBLIC_REFERENCE_CODE_PATTERN.test(upper) ||
    TENANT_PUBLIC_REFERENCE_RESERVED_SHORT_CODES.has(upper)
  ) {
    throw new Error("TENANT_PUBLIC_REFERENCE_SHORT_CODE_INVALID");
  }
  return upper;
}

export function formatTenantPublicReference(
  shortCode: string,
  tenantPublicNumber: bigint | number,
): string {
  const code = normalizeTenantPublicReferenceShortCode(shortCode);
  if (!code) throw new Error("TENANT_PUBLIC_REFERENCE_SHORT_CODE_INVALID");
  const n =
    typeof tenantPublicNumber === "bigint"
      ? tenantPublicNumber
      : BigInt(tenantPublicNumber);
  if (n < TENANT_PUBLIC_NUMBER_MIN || n > TENANT_PUBLIC_NUMBER_MAX) {
    throw new Error("TENANT_PUBLIC_NUMBER_INVALID");
  }
  return `${code}-${n.toString()}`;
}

export function parseTenantPublicReference(
  input: string,
): { shortCode: string; tenantPublicNumber: bigint } | null {
  const trimmed = input.trim();
  const match = TENANT_PUBLIC_REFERENCE_PARSE_PATTERN.exec(trimmed);
  if (!match) return null;
  const shortCode = match[1]!.toUpperCase();
  if (
    !TENANT_PUBLIC_REFERENCE_CODE_PATTERN.test(shortCode) ||
    TENANT_PUBLIC_REFERENCE_RESERVED_SHORT_CODES.has(shortCode)
  ) {
    return null;
  }
  const digits = match[2]!;
  if (digits.length > 19) return null;
  if (digits.length === 19 && digits > TENANT_PUBLIC_NUMBER_MAX.toString()) return null;
  let tenantPublicNumber: bigint;
  try {
    tenantPublicNumber = BigInt(digits);
  } catch {
    return null;
  }
  if (tenantPublicNumber < TENANT_PUBLIC_NUMBER_MIN) return null;
  return { shortCode, tenantPublicNumber };
}

export type TenantPublicReferenceDisplayInput = {
  tenantShortCode: string | null | undefined;
  tenantPublicNumber: bigint | number | null | undefined;
  legacyScePublicNumber?: bigint | number | null | undefined;
};

/** Preferred display reference: tenant `{code}-{n}` when configured; else legacy SCE-… */
export function resolveTenantPublicReferenceDisplay(
  input: TenantPublicReferenceDisplayInput,
): string | null {
  const code = input.tenantShortCode?.trim()
    ? normalizeTenantPublicReferenceShortCode(input.tenantShortCode)
    : null;
  if (code && input.tenantPublicNumber != null) {
    return formatTenantPublicReference(code, input.tenantPublicNumber);
  }
  return scePublicReferenceFromNumber(input.legacyScePublicNumber ?? null);
}

export async function loadTenantPublicReferenceShortCode(
  tx: Prisma.TransactionClient | { tenant: Prisma.TransactionClient["tenant"] },
  tenantId: string,
): Promise<string | null> {
  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { publicReferenceShortCode: true },
  });
  return tenant?.publicReferenceShortCode ?? null;
}