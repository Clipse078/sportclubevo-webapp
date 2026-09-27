"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLATFORM_COMMUNICATION_TEMPLATE_KINDS } from "@/lib/communication/templates/platform-template-constants";

type Initial = {
  name: string;
  description: string;
  kind: string;
  status: string;
  internalName: string;
  subject: string;
  bodyText: string;
};

type Props = {
  templateId?: string;
  initial?: Initial;
};

const defaultInitial: Initial = {
  name: "",
  description: "",
  kind: "CAMPAIGN",
  status: "DRAFT",
  internalName: "",
  subject: "",
  bodyText: "",
};

export default function PlatformTemplateEditor({ templateId, initial = defaultInitial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        kind: form.kind,
        status: form.status,
        internalName: form.internalName || null,
        subject: form.subject || null,
        bodyText: form.bodyText,
        audienceSpec: {
          composition: "UNION" as const,
          components: [{ structural: { wholeOrganisation: true } }],
        },
      };
      const res = templateId
        ? await fetch(`/api/communication/templates/${templateId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/communication/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      router.push("/dashboard/communication/vorlagen");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Name</span>
        <input
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Typ</span>
        <select
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          {PLATFORM_COMMUNICATION_TEMPLATE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Status</span>
        <select
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
        </select>
      </label>
      {form.kind === "CAMPAIGN" ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Interner Kampagnenname</span>
          <input
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            value={form.internalName}
            onChange={(e) => setForm({ ...form, internalName: e.target.value })}
          />
        </label>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Betreff</span>
        <input
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Inhalt</span>
        <textarea
          className="min-h-[160px] w-full rounded-lg border border-[var(--border)] px-3 py-2"
          value={form.bodyText}
          onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
      >
        Speichern
      </button>
    </div>
  );
}
