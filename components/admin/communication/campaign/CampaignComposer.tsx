"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TargetGroupOption = { id: string; name: string; status: string };

type Props = {
  targetGroups: TargetGroupOption[];
  campaignId?: string;
  initialInternalName?: string;
  initialSubject?: string;
  initialBody?: string;
  initialAudienceMode?: "WHOLE_ORG" | "TARGET_GROUPS";
  initialSelectedGroupIds?: string[];
};

type AudienceMode = "WHOLE_ORG" | "TARGET_GROUPS";

export default function CampaignComposer({
  targetGroups,
  campaignId,
  initialInternalName = "",
  initialSubject = "",
  initialBody = "",
  initialAudienceMode = "WHOLE_ORG",
  initialSelectedGroupIds = [],
}: Props) {
  const router = useRouter();
  const [internalName, setInternalName] = useState(initialInternalName);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyText, setBodyText] = useState(initialBody);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(initialAudienceMode);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialSelectedGroupIds);
  const [preview, setPreview] = useState<{
    candidates: number;
    effective: number;
    excluded: number;
    scopeNotice: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildAudienceSpec() {
    if (audienceMode === "WHOLE_ORG") {
      return {
        composition: "UNION" as const,
        components: [{ structural: { wholeOrganisation: true } }],
      };
    }
    return {
      composition: "UNION" as const,
      components: selectedGroupIds.map((id) => ({ savedTargetGroupIds: [id] })),
    };
  }

  async function runPreview() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/communication/campaign/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audienceSpec: buildAudienceSpec() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vorschau fehlgeschlagen");
      setPreview({
        candidates: data.candidates,
        effective: data.effective,
        excluded: data.excluded,
        scopeNotice: data.scopeNotice,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorschau fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(): Promise<string> {
    const audienceSpec = buildAudienceSpec();
    if (campaignId) {
      const res = await fetch(`/api/communication/campaign/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalName, subject, bodyText, audienceSpec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
      return campaignId;
    }
    const res = await fetch("/api/communication/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalName, subject, bodyText, audienceSpec }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
    return data.id as string;
  }

  async function handleAction(mode: "draft" | "ready" | "publish") {
    setError(null);
    setBusy(true);
    try {
      const id = await saveDraft();
      if (mode === "draft") {
        router.push(`/dashboard/communication/kampagnen/${id}`);
        router.refresh();
        return;
      }
      if (mode === "ready") {
        const readyRes = await fetch(`/api/communication/campaign/${id}/ready`, { method: "POST" });
        const readyData = await readyRes.json();
        if (!readyRes.ok) throw new Error(readyData.error ?? "Status konnte nicht gesetzt werden");
      }
      if (mode === "publish") {
        const pubRes = await fetch(`/api/communication/campaign/${id}/publish`, { method: "POST" });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error ?? "Veröffentlichung fehlgeschlagen");
      }
      router.push(`/dashboard/communication/kampagnen/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function toggleGroup(id: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--foreground)]">Interner Kampagnenname</span>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            placeholder="z. B. Frühjahr 2026 — Mitgliederinfo"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--foreground)]">Betreff (Empfänger)</span>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Titel der Kampagne"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-[var(--foreground)]">Inhalt</span>
        <textarea
          className="min-h-[160px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
        />
      </label>

      <fieldset className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-medium">Zielgruppe</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={audienceMode === "WHOLE_ORG"}
            onChange={() => setAudienceMode("WHOLE_ORG")}
          />
          Gesamter Verein
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={audienceMode === "TARGET_GROUPS"}
            onChange={() => setAudienceMode("TARGET_GROUPS")}
          />
          Gespeicherte Zielgruppen (Vereinigung)
        </label>
        {audienceMode === "TARGET_GROUPS" ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {targetGroups.map((tg) => (
              <label key={tg.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(tg.id)}
                  onChange={() => toggleGroup(tg.id)}
                />
                {tg.name}
              </label>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void runPreview()}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          Empfängervorschau
        </button>
        {preview ? (
          <p className="text-xs text-[var(--text-2)]">
            Kandidaten: {preview.candidates} · Wirksam: {preview.effective} · Ausgeschlossen:{" "}
            {preview.excluded}
            {preview.scopeNotice ? ` · ${preview.scopeNotice}` : ""}
          </p>
        ) : null}
      </fieldset>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleAction("draft")}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Entwurf speichern
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleAction("ready")}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Bereit markieren
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleAction("publish")}
          className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          Veröffentlichen
        </button>
      </div>
    </div>
  );
}
