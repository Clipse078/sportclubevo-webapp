import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { VEREINSLEITUNG_DEMO_PERMISSIONS } from "@/lib/nav/vereinsleitung-access";

/** Blocks direct URL access to mock Vereinsleitung demo pages for pilot roles. */
export async function requireVereinsleitungDemoAccess() {
  try {
    await requireAnyPermission(VEREINSLEITUNG_DEMO_PERMISSIONS);
  } catch {
    notFound();
  }
}
