import type { CommunicationDeliveryDetailRow } from "@/lib/communication/analytics/communication-delivery-analytics-service";
import { SectionCard } from "@/components/ui/page";

type Props = {
  rows: CommunicationDeliveryDetailRow[];
};

export default function CommunicationDeliveryDetailTable({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <SectionCard title="Empfängerdetails (Zustellung)" className="mt-6">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-2)]">
              <th className="py-2 pr-4 font-medium">Betroffene Person</th>
              <th className="py-2 pr-4 font-medium">Zustell-Identität</th>
              <th className="py-2 pr-4 font-medium">In-App</th>
              <th className="py-2 pr-4 font-medium">Push</th>
              <th className="py-2 pr-4 font-medium">E-Mail</th>
              <th className="py-2 font-medium">Hinweis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.snapshotId} className="border-b border-[var(--border)]/60">
                <td className="py-2 pr-4">{row.subjectLabel}</td>
                <td className="py-2 pr-4">
                  {row.deliveryIdentityLabel}
                  {row.viaGuardianSubstitution ? (
                    <span className="ml-1 text-xs text-[var(--text-2)]">(Jugendschutz)</span>
                  ) : null}
                </td>
                <td className="py-2 pr-4">{row.inAppEngagement ?? "—"}</td>
                <td className="py-2 pr-4">{row.pushStatus ?? "—"}</td>
                <td className="py-2 pr-4">{row.emailStatus ?? "—"}</td>
                <td className="py-2 text-xs text-[var(--text-2)]">
                  {row.emailSkipOrFailureReason ??
                    (row.pollResponded
                      ? "Umfrage beantwortet"
                      : row.requestClaimed
                        ? "Zusage"
                        : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
