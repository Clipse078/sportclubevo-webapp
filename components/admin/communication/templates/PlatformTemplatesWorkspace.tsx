"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  status: string;
  subject: string | null;
  updatedAt: string;
};

type Props = {
  initialTemplates: TemplateRow[];
  canManage: boolean;
};

export default function PlatformTemplatesWorkspace({ initialTemplates, canManage }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/communication/templates");
    if (!res.ok) return;
    const data = (await res.json()) as { templates: TemplateRow[] };
    setTemplates(data.templates);
  }

  async function applyTemplate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/communication/templates/${id}/use`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vorlage konnte nicht verwendet werden");
      router.push(data.redirectPath as string);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateTemplate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/communication/templates/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Duplizieren fehlgeschlagen");
      }
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  }

  async function archiveTemplate(id: string) {
    if (!window.confirm("Vorlage archivieren?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/communication/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Archivieren fehlgeschlagen");
      }
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-2)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aktualisiert</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {templates.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.kind}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 text-xs text-[var(--text-2)]">
                  {new Date(row.updatedAt).toLocaleString("de-CH")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void applyTemplate(row.id)}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      Verwenden
                    </button>
                    {canManage ? (
                      <>
                        <a
                          href={`/dashboard/communication/vorlagen/${row.id}`}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Bearbeiten
                        </a>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void duplicateTemplate(row.id)}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Duplizieren
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void archiveTemplate(row.id)}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          Archivieren
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--text-2)]">
                  Noch keine Vorlagen vorhanden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
