import type { SceTenantPublicRecordKind } from "@prisma/client";

/** i18n message keys for record-kind labels (reference string stays locale-neutral). */
export const SCE_TENANT_PUBLIC_RECORD_KIND_LABEL_KEY: Record<
  SceTenantPublicRecordKind,
  string
> = {
  TASK: "sce.tenantPublicReference.recordKind.task",
  STRATEGY: "sce.tenantPublicReference.recordKind.strategy",
  TARGET: "sce.tenantPublicReference.recordKind.target",
  MELDUNG: "sce.tenantPublicReference.recordKind.meldung",
};

export function sceTenantPublicRecordKindLabelKey(
  kind: SceTenantPublicRecordKind,
): string {
  return SCE_TENANT_PUBLIC_RECORD_KIND_LABEL_KEY[kind];
}