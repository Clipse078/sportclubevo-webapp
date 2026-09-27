"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TargetGroupOption = { id: string; name: string; status: string };

type Props = {
  targetGroups: TargetGroupOption[];
};

type AudienceMode = "WHOLE_ORG" | "TARGET_GROUPS" | "STRUCTURAL";

export default function ClubCommunicationComposer({ targetGroups }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<"MESSAGE" | "ANNOUNCEMENT" | "ALERT">("ANNOUNCEMENT");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("WHOLE_ORG");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
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
    if (audienceMode === "TARGET_GROUPS") {
      return {
        composition: "UNION" as const,
        components: selectedGroupIds.map((id) => ({ savedTargetGroupIds: [id] })),
      };
    }
    return {
      composition: "UNION" as const,
      components: [{ structural: { wholeOrganisation: true } }],
    };
  }

  async function runPreview() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/communication/club/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, audienceSpec: buildAudienceSpec() }),
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

  async function handleSend(publishMode: "draft" | "send") {
    setError(null);
    setBusy(true);
    try {
      const audienceSpec = buildAudienceSpec();
      if (publishMode === "draft") {
        const res = await fetch("/api/communication/club", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, subject, bodyText, audienceSpec }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
        router.push(`/dashboard/communication/mitteilungen/${data.id}`);
        router.refresh();
        return;
      }

      const res = await fetch("/api/communication/club/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, subject, bodyText, audienceSpec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Versand fehlgeschlagen");
      router.push(`/dashboard/communication/mitteilungen/${data.id}`);
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
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--foreground)]">Typ</span>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="MESSAGE">Nachricht</option>
            <option value="ANNOUNCEMENT">Mitteilung</option>
            <option value="ALERT">Alarm</option>
          </select>
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium text-[var(--foreground)]">Betreff</span>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={kind === "ALERT" ? "Pflicht bei Alarm" : "Optional"}
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

      <fieldset className="rounded-xl border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold text-[var(--foreground)]">Zielgruppe</legend>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={audienceMode === "WHOLE_ORG"}
              onChange={() => setAudienceMode("WHOLE_ORG")}
            />
            Ganzer Verein
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              checked={audienceMode === "TARGET_GROUPS"}
              onChange={() => setAudienceMode("TARGET_GROUPS")}
            />
            Gespeicherte Zielgruppen
          </label>
        </div>
        {audienceMode === "TARGET_GROUPS" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {targetGroups.map((tg) => (
              <button
                key={tg.id}
                type="button"
                onClick={() => toggleGroup(tg.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  selectedGroupIds.includes(tg.id)
                    ? "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]"
                    : "border-[var(--border)] text-[var(--text-2)]"
                }`}
              >
                {tg.name}
              </button>
            ))}
            {targetGroups.length === 0 ? (
              <p className="text-xs text-[var(--text-2)]">Keine aktiven Zielgruppen vorhanden.</p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      {preview ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]">
          <p>
            Kandidaten: <strong>{preview.candidates}</strong> · Effektiv:{" "}
            <strong>{preview.effective}</strong> · Ausgeschlossen:{" "}
            <strong>{preview.excluded}</strong>
          </p>
          {preview.scopeNotice ? <p className="mt-1 text-xs">{preview.scopeNotice}</p> : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={runPreview}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Empfänger-Vorschau
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleSend("draft")}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Entwurf speichern
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleSend("send")}
          className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          Veröffentlichen
        </button>
      </div>
    </div>
  );
}
