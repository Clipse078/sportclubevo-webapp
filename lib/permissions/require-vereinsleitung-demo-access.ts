import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { VEREINSLEITUNG_DEMO_PERMISSIONS } from "@/lib/nav/vereinsleitung-access";
import { requireVereinsleitungWorkspaceAccess } from "@/lib/permissions/require-vereinsleitung-workspace-access";

/** Blocks direct URL access to mock Vereinsleitung demo pages for pilot roles. */
export async function requireVereinsleitungDemoAccess() {
  await requireVereinsleitungWorkspaceAccess();
  try {
    await requireAnyPermission(VEREINSLEITUNG_DEMO_PERMISSIONS);
  } catch {
    notFound();
  }
}
