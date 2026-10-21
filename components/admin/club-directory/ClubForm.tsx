"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SectionCard } from "@/components/ui/page/SectionCard";
import { cn } from "@/lib/cn";

type ClubFormProps = {
  mode: "create" | "edit";
  clubId?: string;
  layout?: "page" | "composer";
  defaultValues?: {
    name?: string;
    shortName?: string;
    alternativeName?: string;
    website?: string;
    location?: string;
    notes?: string;
  };
  onCancel?: () => void;
  onSuccess?: (clubId: string) => void;
};

export default function ClubForm({
  mode,
  clubId,
  layout = "page",
  defaultValues,
  onCancel,
  onSuccess,
}: ClubFormProps) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [shortName, setShortName] = useState(defaultValues?.shortName ?? "");
  const [alternativeName, setAlternativeName] = useState(defaultValues?.alternativeName ?? "");
  const [website, setWebsite] = useState(defaultValues?.website ?? "");
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComposer = layout === "composer";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/club-directory/clubs/${clubId}` : "/api/club-directory/clubs";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shortName: shortName || null,
          alternativeName: alternativeName || null,
          website: website || null,
          location: location || null,
          notes: notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Fehler beim Speichern.");
        return;
      }

      const targetId = mode === "edit" ? clubId : data?.club?.id;
      if (targetId && onSuccess) {
        onSuccess(targetId);
        return;
      }
      router.push(targetId ? `/dashboard/vereine/${targetId}` : "/dashboard/vereine");
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.back();
  }

  const fieldBody = (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="fca-label">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. SV Muttenz"
          className="fca-input w-full"
          required
        />
      </div>
      <div>
        <label className="fca-label">Kurzname</label>
        <input
          type="text"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          placeholder="z.B. Muttenz"
          className="fca-input w-full"
        />
      </div>
      <div>
        <label className="fca-label">Alternativname</label>
        <input
          type="text"
          value={alternativeName}
          onChange={(e) => setAlternativeName(e.target.value)}
          placeholder="Optional"
          className="fca-input w-full"
        />
      </div>
      <div>
        <label className="fca-label">Website</label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://…"
          className="fca-input w-full"
        />
      </div>
      <div>
        <label className="fca-label">Ort / Adresse</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Optional"
          className="fca-input w-full"
        />
      </div>
      <div className="md:col-span-2">
        <label className="fca-label">Notizen</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optionale interne Notiz…"
          className="fca-input w-full min-h-[4.5rem]"
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", isComposer && "pb-2")} data-testid="club-form">
      {error ? (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {isComposer ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-1)]">Vereinsdaten</h3>
          {fieldBody}
        </div>
      ) : (
        <SectionCard title="Vereinsdaten">{fieldBody}</SectionCard>
      )}

      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={handleCancel} className="fca-button-secondary">
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className="fca-button-primary inline-flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {mode === "create" ? "Verein erstellen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
