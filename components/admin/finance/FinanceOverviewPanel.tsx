import Link from "next/link";
import type { FinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";

type FinanceOverviewPanelProps = {
  state: FinanceOverviewState;
  canAdmin: boolean;
  labels: {
    notConfiguredTitle: string;
    notConfiguredBody: string;
    incompleteTitle: string;
    incompleteBody: string;
    configuredNoDataTitle: string;
    configuredNoDataBody: string;
    configuredCapabilitiesTitle: string;
    configuredCapabilitiesBody: string;
    openSetup: string;
  };
};

export function FinanceOverviewPanel({
  state,
  canAdmin,
  labels,
}: FinanceOverviewPanelProps) {
  const copy = (() => {
    switch (state) {
      case "NOT_CONFIGURED":
        return { title: labels.notConfiguredTitle, body: labels.notConfiguredBody };
      case "SETUP_INCOMPLETE":
        return { title: labels.incompleteTitle, body: labels.incompleteBody };
      case "CONFIGURED_WITH_CAPABILITIES":
        return {
          title: labels.configuredCapabilitiesTitle,
          body: labels.configuredCapabilitiesBody,
        };
      case "CONFIGURED_NO_DATA":
      default:
        return {
          title: labels.configuredNoDataTitle,
          body: labels.configuredNoDataBody,
        };
    }
  })();

  return (
    <section
      className="rounded-xl border border-[var(--sce-color-border-standard)] bg-[var(--surface)] px-5 py-6"
      data-finance-overview-state={state}
    >
      <h2 className="text-base font-semibold text-[var(--foreground)]">{copy.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy.body}</p>
      {canAdmin && state !== "CONFIGURED_WITH_CAPABILITIES" ? (
        <div className="mt-4">
          <Link
            href="/dashboard/finance/settings"
            className="inline-flex h-8 items-center rounded-md border border-[var(--sce-color-border-standard)] px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            {labels.openSetup}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
