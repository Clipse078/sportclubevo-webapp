"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";

type Props = {
  mode: "create" | "edit";
  targetGroupId?: string;
  defaultValues?: {
    name?: string;
    key?: string;
    description?: string;
    status?: string;
    definition?: ZielgruppeEditorDefinition;
  };
  knownLabels?: {
    orgUnits: Record<string, string>;
    teams: Record<string, string>;
    roles: Record<string, string>;
    persons: Record<string, string>;
  };
  canManage?: boolean;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
  { value: "ARCHIVED", label: "Archiviert" },
] as const;

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-1.5";

export default function ZielgruppeManagementForm({
  mode,
  targetGroupId,
  defaultValues,
  knownLabels,
  canManage = true,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [key, setKey] = useState(defaultValues?.key ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "ACTIVE");
  const [definition, setDefinition] = useState<ZielgruppeEditorDefinition>(
    defaultValues?.definition ?? { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canManage;

  const mergedLabels = useMemo(
    () => knownLabels ?? { orgUnits: {}, teams: {}, roles: {}, persons: {} },
    [knownLabels],
  );

  function handleNameChange(v: string) {
    setName(v);
    if (mode === "create" && !defaultValues?.key) {
      setKey(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    if (!name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    setLoading(true);
    try {
      const url =
        mode === "edit"
          ? `/api/target-groups/${targetGroupId}`
          : "/api/target-groups";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(mode === "create" ? { key: key || undefined } : {}),
          description: description || null,
          status,
          definition,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Fehler beim Speichern.");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (mode === "create" && data?.targetGroup?.id) {
        router.push(`/dashboard/communication/zielgruppen/${data.targetGroup.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sce-form-card space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="zg-name">
            Name *
          </label>
          <input
            id="zg-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="z.B. Alle Trainer, F2 Eltern"
            required
            disabled={readOnly}
            className="fca-input"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="zg-status">
            Status
          </label>
          <select
            id="zg-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={readOnly}
            className="fca-select"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "create" ? (
        <div>
          <label className={labelClass} htmlFor="zg-key">
            Key
          </label>
          <input
            id="zg-key"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={readOnly}
            className="fca-input font-mono text-sm"
          />
        </div>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="zg-description">
          Beschreibung
        </label>
        <textarea
          id="zg-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={readOnly}
          placeholder="Zweck dieser Zielgruppe (empfohlen)"
          className="fca-input resize-none"
        />
      </div>

      <div className="border-t border-[var(--border)] pt-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">Zieldefinition</h2>
        <ZielgruppeDefinitionEditor
          value={definition}
          onChange={setDefinition}
          knownLabels={mergedLabels}
          disabled={readOnly}
        />
      </div>

      {error ? (
        <div
          className="rounded-[var(--radius-xl)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="fca-button-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={loading} className="fca-button-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? "Speichern…" : mode === "create" ? "Zielgruppe erstellen" : "Speichern"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
