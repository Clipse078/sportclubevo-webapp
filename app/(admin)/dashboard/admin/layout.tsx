import type { ReactNode } from "react";
import { headers } from "next/headers";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { resolveAdminAreaRoutePermissionKeys } from "@/lib/permissions/admin-area-route-access";

type AdminAreaLayoutProps = {
  children: ReactNode;
};

export default async function AdminAreaLayout({ children }: AdminAreaLayoutProps) {
  const headerStore = await headers();
  const pathname =
    headerStore.get("x-sce-pathname") ?? headerStore.get("x-invoke-path") ?? "/dashboard/admin";

  await requireAnyPermission(resolveAdminAreaRoutePermissionKeys(pathname));

  return children;
}
