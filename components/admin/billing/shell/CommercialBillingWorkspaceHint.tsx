import Link from "next/link";
import { BILLING_WORKSPACE_BASE } from "@/lib/nav/billing-workspace-nav";

export default function CommercialBillingWorkspaceHint() {
  return (
    <p className="text-xs text-[var(--muted)] leading-relaxed">
      <span className="text-[var(--text-2)]">Navigation:</span>{" "}
      <Link href={BILLING_WORKSPACE_BASE} className="underline-offset-2 hover:underline">
        Commercial
      </Link>
      {" → "}
      <span className="text-[var(--text-2)]">Abrechnung</span>
      {" → "}
      <Link
        href={`${BILLING_WORKSPACE_BASE}/operations`}
        className="underline-offset-2 hover:underline"
      >
        Operations
      </Link>
      . Nicht mit der Plattform-Seite «Runtime &amp; Deployment» verwechseln.
    </p>
  );
}
