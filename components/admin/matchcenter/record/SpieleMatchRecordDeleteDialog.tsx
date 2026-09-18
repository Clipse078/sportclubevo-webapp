"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

type Impact = { key: string; label: string; count: number };

type Props = {
  matchId: string;
  matchTitle: string;
  open: boolean;
  onClose: () => void;
};

export default function SpieleMatchRecordDeleteDialog({
  matchId,
  matchTitle,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<Impact[] | null>(null);
  const [impactLoaded, setImpactLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      setImpact(null);
      setImpactLoaded(false);
      setError(null);
      return;
    }
    void ensureImpact();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open
  }, [open]);

  async function ensureImpact() {
    if (impactLoaded || loadingImpact) return;
    setLoadingImpact(true);
    setError(null);
    try {
      const response = await fetch(`/api/matchcenter/${matchId}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Löschen nicht möglich.");
      }
      setImpact(Array.isArray(data?.impact) ? data.impact : []);
      setImpactLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setLoadingImpact(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/matchcenter/${matchId}?confirm=true`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Löschen fehlgeschlagen.");
      }
      onClose();
      router.push("/dashboard/matchcenter");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`„${matchTitle}" endgültig löschen?`}
      description="Diese Aktion ist endgültig und kann nicht rückgängig gemacht werden."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            disabled={loadingImpact}
            onClick={handleConfirmDelete}
          >
            Endgültig löschen
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? <p className="text-sm font-medium text-[var(--sce-danger)]">{error}</p> : null}
        {loadingImpact ? (
          <p className="text-sm text-[var(--text-2)]">Auswirkungen werden geprüft…</p>
        ) : impact && impact.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] p-3 text-[var(--sce-warning)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="text-sm">
                Folgende verknüpfte Daten werden ebenfalls unwiderruflich entfernt.
              </p>
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--text-2)]">
              {impact.map((item) => (
                <li key={item.key}>
                  {item.label}: {item.count}
                </li>
              ))}
            </ul>
          </div>
        ) : impact ? (
          <p className="text-sm text-[var(--text-2)]">Keine weiteren Abhängigkeiten.</p>
        ) : null}
      </div>
    </Dialog>
  );
}
