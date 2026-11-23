import { scePublicReferenceFromNumber } from "@/lib/club-development/sce-public-reference";
import { resolveTenantPublicReferenceDisplay } from "./sce-tenant-public-reference";

export function resolveMeldungPublicReferenceDisplay(input: {
  tenantShortCode: string | null | undefined;
  tenantPublicNumber: bigint | number | null | undefined;
  scePublicNumber: bigint | number | null | undefined;
  caseNumber: string;
}): string {
  return (
    resolveTenantPublicReferenceDisplay({
      tenantShortCode: input.tenantShortCode,
      tenantPublicNumber: input.tenantPublicNumber,
      legacyScePublicNumber: input.scePublicNumber,
    }) ??
    scePublicReferenceFromNumber(input.scePublicNumber) ??
    input.caseNumber
  );
}