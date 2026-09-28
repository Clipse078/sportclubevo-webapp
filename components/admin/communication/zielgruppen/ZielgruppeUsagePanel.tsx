import Link from "next/link";
import type { ZielgruppeUsageSummary } from "@/lib/communication/zielgruppen/usage-references";
import { zielgruppeUsageStatusLabel } from "@/lib/communication/usage-reference-display";

const KIND_LABELS: Record<string, string> = {
  CAMPAIGN: "Kampagne",
  CLUB_MESSAGE: "Mitteilung",
  TEMPLATE: "Vorlage",
  REQUIREMENT: "Aufgabe",
  REGISTRATION: "Anmeldung",
};

type Props = {
  usage: ZielgruppeUsageSummary;
};

export default function ZielgruppeUsagePanel({ usage }: Props) {
  if (usage.references.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Derzeit keine gespeicherten Verweise in Kampagnen, Mitteilungen oder Vorlagen.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {usage.references.map((ref) => (
          <li key={`${ref.kind}-${ref.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              {KIND_LABELS[ref.kind] ?? ref.kind}
            </span>
            {ref.href ? (
              <Link href={ref.href} className="font-medium text-[var(--sce-primary)] hover:underline">
                {ref.label}
              </Link>
            ) : (
              <span className="font-medium text-[var(--foreground)]">{ref.label}</span>
            )}
            {ref.statusHint ? (
              <span className="text-xs text-[var(--muted)]">
                {zielgruppeUsageStatusLabel(ref.kind, ref.statusHint)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {usage.truncated ? (
        <p className="text-xs text-[var(--muted)]">
          Weitere Verweise möglich — Liste ist absichtlich begrenzt.
        </p>
      ) : null}
    </div>
  );
}
