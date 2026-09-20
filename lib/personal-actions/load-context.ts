import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PersonalActionSourceContext } from "./sources/types";

export async function resolvePersonalActionSourceContext(args: {
  tenantId: string;
  userId: string;
  permissionKeys?: readonly string[];
  now?: Date;
}): Promise<PersonalActionSourceContext> {
  if (args.permissionKeys) {
    return {
      tenantId: args.tenantId,
      userId: args.userId,
      permissionKeys: args.permissionKeys,
      now: args.now ?? new Date(),
    };
  }

  const { platform, tenant } = await getRequestEffectivePermissions(
    args.userId,
    args.tenantId,
  );

  return {
    tenantId: args.tenantId,
    userId: args.userId,
    permissionKeys: [...platform, ...tenant],
    now: args.now ?? new Date(),
  };
}
