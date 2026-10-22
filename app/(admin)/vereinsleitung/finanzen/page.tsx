import { redirect } from "next/navigation";
import { FINANCE_WORKSPACE_ROUTE_V1 } from "@/lib/finance/finance-architecture";

/** @deprecated Use {@link FINANCE_WORKSPACE_ROUTE_V1} — layout performs the redirect. */
export default function LegacyVereinsleitungFinanzenPage() {
  redirect(FINANCE_WORKSPACE_ROUTE_V1);
}
