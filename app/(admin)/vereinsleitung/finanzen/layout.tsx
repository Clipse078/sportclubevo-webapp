import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { FINANCE_WORKSPACE_ROUTE_V1 } from "@/lib/finance/finance-architecture";

/**
 * Legacy Vereinsleitung finance demo routes redirect to the canonical FIN-01B
 * workspace. Demo UI remains in git history; see docs/finance/SCE-FINANCE-01B-IMPLEMENTATION.md.
 */
export default async function VereinsleitungFinanzenLayout(_props: { children: ReactNode }) {
  redirect(FINANCE_WORKSPACE_ROUTE_V1);
}
