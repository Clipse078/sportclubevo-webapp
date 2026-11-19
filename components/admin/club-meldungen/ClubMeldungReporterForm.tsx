"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CLUB_MELDUNG_CATEGORY_LABELS } from "@/lib/club-meldungen/copy";
import type { ClubMeldungCategory } from "@prisma/client";
import { SwitchToggle } from "@/components/ui/SwitchToggle";

const CATEGORY_OPTIONS = Object.entries(CLUB_MELDUNG_CATEGORY_LABELS) as [
  ClubMeldungCategory,
  string,
][];

type Props = {
  tenantSlug: string;
  initial?: {
    subject?: string;
    description?: string;
    locationHint?: string;
    category?: ClubMeldungCategory;
    urgent?: boolean;
    urgentNote?: string;
  };
  errorMessage?: string | null;
};

export default function ClubMeldungReporterForm({ tenantSlug, initial, errorMessage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useMemo(
    () =>
      typeof window !== "undefined"
        ? (sessionStorage.getItem("meldung-idem") ??
          (() => {
            const key = crypto.randomUUID();
            sessionStorage.setItem("meldung-idem", key);
            return key;
          })())
        : "server",
    [],
  );

  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [locationHint, setLocationHint] = useState(initial?.locationHint ?? "");
  const [category, setCategory] = useState<ClubMeldungCategory>(
    initial?.category ?? "DAMAGE_OR_PROBLEM",
  );
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [urgentNote, setUrgentNote] = useState(initial?.urgentNote ?? "");
  const [localError, setLocalError] = useState<string | null>(errorMessage ?? null);

  const draftKey = `meldung-draft-${tenantSlug}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Props["initial"];
      if (draft?.subject) setSubject(draft.subject);
      if (draft?.description) setDescription(draft.description);
      if (draft?.locationHint) setLocationHint(draft.locationHint);
      if (draft?.category) setCategory(draft.category);
      if (typeof draft?.urgent === "boolean") setUrgent(draft.urgent);
      if (draft?.urgentNote) setUrgentNote(draft.urgentNote);
    } catch {
      // ignore corrupt draft
    }
  }, [draftKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({ subject, description, locationHint, category, urgent, urgentNote }),
    );
  }, [draftKey, subject, description, locationHint, category, urgent, urgentNote]);

  function submit() {
    setLocalError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}/meldungen`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            idempotencyKey,
            subject,
            description,
            category,
            locationHint: locationHint || null,
            urgent,
            urgentNote: urgent ? urgentNote : null,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setLocalError(payload.error ?? "Meldung konnte nicht gespeichert werden.");
          return;
        }
        sessionStorage.removeItem("meldung-idem");
        sessionStorage.removeItem(draftKey);
        router.push(
          `/tenant/${tenantSlug}/anliegen/${payload.meldung.id}?created=${payload.created ? "1" : "0"}`,
        );
        router.refresh();
      } catch {
        setLocalError("Netzwerkfehler — bitte erneut versuchen.");
      }
    });
  }

  return (
    <form
      className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) submit();
      }}
    >
      {localError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {localError}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-900">Betreff</span>
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2"
          disabled={pending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-900">Beschreibung</span>
        <textarea
          required
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2"
          disabled={pending}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-900">Kategorie</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ClubMeldungCategory)}
          className="rounded-md border border-slate-200 px-3 py-2"
          disabled={pending}
        >
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-900">Ort oder Bereichshinweis (optional)</span>
        <input
          value={locationHint}
          onChange={(e) => setLocationHint(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2"
          disabled={pending}
        />
      </label>

      <SwitchToggle
        id="meldung-urgent"
        label="Dringend?"
        description="Signalisiert Dringlichkeit — kein Notruf und keine Garantie für Sofortreaktion."
        checked={urgent}
        onChange={setUrgent}
        disabled={pending}
      />

      {urgent ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-900">Kurze Erläuterung</span>
          <input
            required
            value={urgentNote}
            onChange={(e) => setUrgentNote(e.target.value)}
            className="rounded-md border border-slate-200 px-3 py-2"
            disabled={pending}
          />
        </label>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="sce-button-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Wird gesendet…" : "Anliegen melden"}
      </button>
    </form>
  );
}