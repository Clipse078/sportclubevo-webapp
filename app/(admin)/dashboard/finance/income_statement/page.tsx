import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Shallow alias — Management P&L lives under Reporting (FIN-05C). */
export default function FinanceIncomeStatementAliasPage() {
  redirect("/dashboard/finance/reports");
}
