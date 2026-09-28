"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import ZielgruppePreviewPanel from "@/components/admin/communication/zielgruppen/ZielgruppePreviewPanel";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { EMPTY_ZIELGRUPPE_EDITOR_DEFINITION } from "@/lib/communication/zielgruppen/editor-model";
import { zielgruppeDefinitionIsEmpty } from "@/lib/communication/zielgruppen/editor-model";

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
  startEditing?: boolean;
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
  startEditing = true,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(startEditing);
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [key] = useState(defaultValues?.key ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "ACTIVE");
  const [definition, setDefinition] = useState<ZielgruppeEditorDefinition>(
    defaultValues?.definition ?? { ...EMPTY_ZIELGRUPPE_EDITOR_DEFINITION },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canManage || !editing;

  const mergedLabels = useMemo(
    () => knownLabels ?? { orgUnits: {}, teams: {}, roles: {}, persons: {} },
    [knownLabels],
  );

  function derivedKeyFromName(v: string): string {
    return v
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function validateBasics(): string | null {
    if (!name.trim()) return "Name ist erforderlich.";
    return null;
  }

  function validateRules(): string | null {
    if (zielgruppeDefinitionIsEmpty(definition) && !definition.wholeOrganisation) {
      return "Bitte mindestens ein Zielkriterium oder „Ganze Organisation“ wählen.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    const basicsErr = validateBasics();
    if (basicsErr) {
      setError(basicsErr);
      return;
    }
    const rulesErr = validateRules();
    if (rulesErr) {
      setError(rulesErr);
      return;
    }
    setLoading(true);
    try {
      const url =
        mode === "edit"
          ? `/api/target-groups/${targetGroupId}`
          : "/api/target-groups";
      const method = mode === "edit" ? "PATCH" : "POST";
      const createKey = key || derivedKeyFromName(name);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ...(mode === "create" ? { key: createKey || undefined } : {}),
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
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "edit" && !editing) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          className="fca-button-primary"
          onClick={() => setEditing(true)}
        >
          Zielgruppe bearbeiten
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sce-form-card space-y-8">
      <section className="space-y-5" aria-labelledby="zg-basics-heading">
        <h2 id="zg-basics-heading" className="text-base font-semibold text-[var(--foreground)]">
          Grundlagen
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="zg-name">
              Name *
            </label>
            <input
              id="zg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Alle Trainer der Junioren"
              required
              disabled={readOnly}
              className="fca-input"
            />
          </div>
          {mode === "edit" ? (
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
          ) : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="zg-description">
            Beschreibung
          </label>
          <textarea
            id="zg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={readOnly}
            placeholder="Kurz beschreiben, wofür diese Zielgruppe gedacht ist"
            className="fca-input resize-none"
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <ZielgruppeDefinitionEditor
          value={definition}
          onChange={setDefinition}
          knownLabels={mergedLabels}
          disabled={readOnly}
        />
        <ZielgruppePreviewPanel definition={definition} disabled={readOnly} live={!readOnly} />
      </div>

      {error ? (
        <div
          className="rounded-[var(--radius-xl)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={() => router.back()} className="fca-button-secondary">
          Abbrechen
        </button>
        {canManage ? (
          <button type="submit" disabled={loading || readOnly} className="fca-button-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? "Speichern…" : mode === "create" ? "Zielgruppe erstellen" : "Speichern"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
