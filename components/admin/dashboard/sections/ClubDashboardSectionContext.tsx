import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import type { PermissionKey } from "@/lib/permissions/permissions";
import type { ActorContext } from "@/lib/visibility/actor-context";
import type { PersonalDashboardSectionContext } from "@/lib/dashboard/personal-dashboard-section-loaders";

export type ClubDashboardSectionsBaseProps = {
  tenantId: string;
  userId: string;
  tenantClubName: string;
  actor: Pick<ActorContext, "tenantId" | "userId" | "permissionKeys"> | null;
  fmtCfg: TenantFormatConfig;
  permissionKeys: PermissionKey[];
  calendarMonthParam?: string | null;
};

export function toPersonalDashboardSectionContext(
  props: ClubDashboardSectionsBaseProps,
): PersonalDashboardSectionContext {
  return {
    tenantId: props.tenantId,
    userId: props.userId,
    actor: props.actor,
    fmtCfg: props.fmtCfg,
    permissionKeys: props.permissionKeys,
    calendarMonthParam: props.calendarMonthParam,
  };
}