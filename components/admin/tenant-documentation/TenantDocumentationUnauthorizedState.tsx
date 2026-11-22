import Link from "next/link";

import { EmptyState } from "@/components/ui/page/EmptyState";
import type { TenantDocumentationHubRouteAccess } from "@/lib/tenant-documentation/route-access";

type DeniedKind = Exclude<TenantDocumentationHubRouteAccess["kind"], "granted" | "unauthenticated">;

type Props = {
  reason: DeniedKind;
};

function resolveCopy(reason: DeniedKind): { heading: string; description: string } {
  switch (reason) {
    case "forbidden":
      return {
        heading: "Kein Zugriff auf Dokumentation",
        description:
          "Für diesen Bereich ist eine Dokumentations-Berechtigung in Ihrem Verein erforderlich. Bitte wenden Sie sich an die Club-Administration, wenn Sie Zugang benötigen.",
      };
    case "no_tenant_context":
      return {
        heading: "Kein Vereinskontext",
        description:
          "Dokumentation ist nur innerhalb eines aktiven Vereinskontexts verfügbar. Wechseln Sie den Verein über das Dashboard oder melden Sie sich erneut an.",
      };
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function TenantDocumentationUnauthorizedState({ reason }: Props) {
  const copy = resolveCopy(reason);

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      data-testid="tenant-documentation-unauthorized"
      data-reason={reason}
    >
      <EmptyState
        heading={copy.heading}
        description={copy.description}
        action={
          <Link href="/dashboard" className="fca-button-secondary text-sm">
            Zum Dashboard
          </Link>
        }
      />
    </div>
  );
}