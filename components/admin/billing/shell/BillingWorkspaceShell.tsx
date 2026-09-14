import type { ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";
import BillingWorkspaceNav from "./BillingWorkspaceNav";

type Props = {
  children: ReactNode;
};

export default async function BillingWorkspaceShell({ children }: Props) {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  const session = await auth();
  const actorId = session?.user?.actorUserId ?? session?.user?.id ?? null;
  const showOperations =
    Boolean(actorId) && (await isPlatformSuperAdmin(prisma, actorId!));

  return (
    <div className="w-full space-y-8">
      <BillingWorkspaceNav showOperations={showOperations} />
      {children}
    </div>
  );
}
