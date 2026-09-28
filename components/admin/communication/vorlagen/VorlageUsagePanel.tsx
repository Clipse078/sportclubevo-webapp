import Link from "next/link";
import type { TemplateUsageSummary } from "@/lib/communication/templates/template-usage-references";

type Props = {
  usage: TemplateUsageSummary;
};

export default function VorlageUsagePanel({ usage }: Props) {
  return (
    <section aria-labelledby="vorlage-usage-heading" className="space-y-3">
      <h2 id="vorlage-usage-heading" className="text-base font-semibold text-[var(--foreground)]">
        Verwendet in
      </h2>
      {usage.totalCount === 0 ? (
        <p className="text-sm text-[var(--text-2)]">
          Noch keine Entwürfe oder Kommunikationen mit nachweisbarer Vorlagen-Herkunft.
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--text-2)]">
            {usage.totalCount === 1
              ? "1 Kommunikation mit gespeicherter Vorlagen-Referenz"
              : `${usage.totalCount} Kommunikationen mit gespeicherter Vorlagen-Referenz`}
            {usage.truncated ? " (Auszug)" : ""}
          </p>
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {usage.references.map((ref) => (
              <li key={ref.id} className="px-4 py-3 text-sm">
                <Link href={ref.href} className="font-medium text-[var(--sce-primary)] hover:underline">
                  {ref.label}
                </Link>
                <span className="mt-1 block text-xs text-[var(--text-2)]">Status: {ref.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
