import type { ReactNode } from "react";
import { requireVereinsleitungDemoAccess } from "@/lib/permissions/require-vereinsleitung-demo-access";

export default async function VereinsleitungMaterialLayout({ children }: { children: ReactNode }) {
  await requireVereinsleitungDemoAccess();
  return children;
}
