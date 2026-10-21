"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import type { FacilityType } from "@prisma/client";

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  PITCH: "Spielfeld",
  DRESSING_ROOM_BLOCK: "Garderobenblock",
  INDOOR_HALL: "Innenhalle",
  OTHER: "Sonstiges",
};

export type CreateFacilityResult = {
  id: string;
  name: string;
  type: FacilityType;
  status: "ACTIVE" | "ARCHIVED";
  sortOrder: number;
  resources: [];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (facility: CreateFacilityResult) => void;
  onRefresh: () => void;
};

export default function CreateFacilityComposerDialog({
  open,
  onClose,
  onCreated,
  onRefresh,
}: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("PITCH");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetAndClose() {
    setName("");
    setType("PITCH");
    setError(null);
    onClose();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Fehler beim Erstellen.");
        return;
      }
      const data = await res.json();
      onCreated({ ...data.facility, resources: [] });
      onRefresh();
      resetAndClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      title="Neue Anlage"
      description="Physischen Standort anlegen — Ressourcen können danach zugeordnet werden."
      size="md"
      footer={null}
    >
      <form onSubmit={submit} className="space-y-4">
        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="facility-create-name" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Name
            </label>
            <input
              id="facility-create-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Hauptplatz"
              className="fca-input w-full text-sm"
            />
          </div>
          <div>
            <label htmlFor="facility-create-type" className="mb-1 block text-xs font-medium text-[var(--muted)]">
              Typ
            </label>
            <select
              id="facility-create-type"
              value={type}
              onChange={(e) => setType(e.target.value as FacilityType)}
              className="fca-input w-full text-sm"
            >
              {(Object.keys(FACILITY_TYPE_LABELS) as FacilityType[]).map((t) => (
                <option key={t} value={t}>
                  {FACILITY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="fca-button-secondary" onClick={resetAndClose} disabled={pending}>
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="fca-button-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {pending ? "Wird erstellt…" : "Anlage erstellen"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
