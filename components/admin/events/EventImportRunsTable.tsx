import { prisma } from "@/lib/db/prisma";

function getStatusClasses(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";
    case "RUNNING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]";
  }
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventImportRunsTable() {
  const runs = await prisma.eventImportRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="fca-eyebrow">Import Historie</p>
          <h3 className="fca-heading mt-2">Letzte Event Imports</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-2)]">
            Übersicht über abgeschlossene, laufende oder fehlgeschlagene Imports inklusive Dateiname und Mengen.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="fca-status-box fca-status-box-muted mt-6">
          Noch keine Event-Imports vorhanden.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-[var(--border)]">
          <table className="w-full text-left">
            <thead className="bg-[var(--surface-2)]">
              <tr className="border-b border-[var(--border)] text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                <th className="px-4 py-3">Zeitpunkt</th>
                <th className="px-4 py-3">Datei</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Erkannt</th>
                <th className="px-4 py-3">Erstellt</th>
                <th className="px-4 py-3">Fehler</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-[var(--border)] bg-white last:border-b-0">
                  <td className="px-4 py-3 text-sm text-[var(--text-2)]">
                    {formatDateTime(run.createdAt)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">
                      {run.fileName ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Batch: {run.importBatchKey}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={"inline-flex rounded-full border px-3 py-1 text-xs font-semibold " + getStatusClasses(run.status)}>
                      {run.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-[var(--text-2)]">{run.rowsDetected}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-2)]">{run.rowsCreated}</td>

                  <td className="px-4 py-3 text-sm text-[var(--text-2)]">
                    {run.errorMessage ? (
                      <span className="text-red-700">{run.errorMessage}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}