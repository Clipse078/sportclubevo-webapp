"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import ZielgruppePreviewPanel, {
  type PreviewStats,
} from "@/components/admin/communication/zielgruppen/ZielgruppePreviewPanel";
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
  const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canManage || !editing;

  const mergedLabels = useMemo(
    () => knownLabels ?? { orgUnits: {}, teams: {}, roles: {}, persons: {} },
    [knownLabels],
  );

  const compactFormula = useMemo(() => {
    const parts: string[] = [];
    if (definition.wholeOrganisation) {
      parts.push("Ganze Organisation");
    } else {
      if (definition.orgUnitIds.length > 0) {
        parts.push(
          `${definition.orgUnitIds.length} Organisationseinheit${definition.orgUnitIds.length === 1 ? "" : "en"}`,
        );
      }
      if (definition.teamIds.length > 0) {
        parts.push(`${definition.teamIds.length} Team${definition.teamIds.length === 1 ? "" : "s"}`);
      }
      if (definition.roleIds.length > 0) {
        parts.push(`${definition.roleIds.length} Rolle${definition.roleIds.length === 1 ? "" : "n"}`);
      }
    }
    const direct =
      definition.includePersonIds.length + definition.includeExternalContactIds.length;
    if (direct > 0) {
      parts.push(`+ ${direct} direkt hinzugefügt`);
    }
    const excluded =
      definition.excludeOrgUnitIds.length +
      definition.excludeTeamIds.length +
      definition.excludeRoleIds.length +
      definition.excludePersonIds.length +
      definition.excludeExternalContactIds.length;
    if (excluded > 0) {
      parts.push(`− ${excluded} ausgeschlossen`);
    }
    if (parts.length === 0) return null;
    const resolved =
      previewStats != null ? `= ${previewStats.totalRecipients} aktuelle Empfänger` : null;
    return { parts, resolved };
  }, [definition, previewStats]);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {canManage ? (
        <div className="hidden justify-end lg:flex">
          <button
            type="submit"
            disabled={loading || readOnly}
            className="fca-button-primary min-h-11"
            data-testid="zielgruppe-save"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? "Speichern…" : "Zielgruppe speichern"}
          </button>
        </div>
      ) : null}

      <section
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
        aria-labelledby="zg-basics-heading"
      >
        <h2 id="zg-basics-heading" className="sr-only">
          Grundlagen
        </h2>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-[var(--foreground)]"
              htmlFor="zg-name"
            >
              Name <span className="text-red-600">*</span>
            </label>
            <input
              id="zg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Vereinsleitung & Trainer"
              required
              disabled={readOnly}
              className="fca-input text-base"
            />
          </div>
          {mode === "edit" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="zg-status">
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
          ) : (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-[var(--muted)]"
                htmlFor="zg-description"
              >
                Beschreibung <span className="font-normal">(optional)</span>
              </label>
              <input
                id="zg-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
                placeholder="Kurz notieren, wofür die Gruppe gedacht ist"
                className="fca-input"
              />
            </div>
          )}
        </div>
        {mode === "edit" ? (
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-[var(--muted)]" htmlFor="zg-description-edit">
              Beschreibung <span className="font-normal">(optional)</span>
            </label>
            <input
              id="zg-description-edit"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              className="fca-input"
            />
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)] lg:items-start">
        <ZielgruppeDefinitionEditor
          value={definition}
          onChange={setDefinition}
          knownLabels={mergedLabels}
          disabled={readOnly}
        />
        <ZielgruppePreviewPanel
          definition={definition}
          disabled={readOnly}
          live={!readOnly}
          onStatsChange={setPreviewStats}
        />
      </div>

      {compactFormula ? (
        <p
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-2)]"
          aria-live="polite"
          data-testid="zielgruppe-compact-formula"
        >
          <span className="font-medium text-[var(--foreground)]">Zielgruppe: </span>
          {compactFormula.parts.join(" · ")}
          {compactFormula.resolved ? ` ${compactFormula.resolved}` : ""}
        </p>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={() => router.back()} className="fca-button-secondary min-h-11">
          Abbrechen
        </button>
        {canManage ? (
          <button
            type="submit"
            disabled={loading || readOnly}
            className="fca-button-primary min-h-11 lg:hidden"
          >
            {loading ? "Speichern…" : "Zielgruppe speichern"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
