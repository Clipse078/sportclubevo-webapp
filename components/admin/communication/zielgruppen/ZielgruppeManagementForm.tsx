"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ZielgruppeDefinitionEditor from "@/components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor";
import ZielgruppeHumanRulesPanel from "@/components/admin/communication/zielgruppen/ZielgruppeHumanRulesPanel";
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
  /** When false, start in read-only review until user enters edit flow on detail page. */
  startEditing?: boolean;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
  { value: "ARCHIVED", label: "Archiviert" },
] as const;

const STEPS = [
  { id: "basics", label: "Grundlagen" },
  { id: "rules", label: "Regeln / Empfänger" },
  { id: "preview", label: "Vorschau" },
  { id: "review", label: "Überprüfen" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

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
  const [step, setStep] = useState<StepId>("basics");
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

  const stepIndex = STEPS.findIndex((s) => s.id === step);

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

  function goNext() {
    setError(null);
    if (step === "basics") {
      const err = validateBasics();
      if (err) {
        setError(err);
        return;
      }
      setStep("rules");
      return;
    }
    if (step === "rules") {
      const err = validateRules();
      if (err) {
        setError(err);
        return;
      }
      setStep("preview");
      return;
    }
    if (step === "preview") {
      setStep("review");
    }
  }

  function goBack() {
    setError(null);
    if (step === "rules") setStep("basics");
    else if (step === "preview") setStep("rules");
    else if (step === "review") setStep("preview");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    const basicsErr = validateBasics();
    if (basicsErr) {
      setError(basicsErr);
      setStep("basics");
      return;
    }
    const rulesErr = validateRules();
    if (rulesErr) {
      setError(rulesErr);
      setStep("rules");
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
          onClick={() => {
            setEditing(true);
            setStep("basics");
          }}
        >
          Zielgruppe bearbeiten
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sce-form-card space-y-6">
      <nav aria-label="Zielgruppe erstellen — Schritte">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, index) => {
            const active = s.id === step;
            const done = index < stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                    active
                      ? "bg-[var(--sce-primary)] text-white"
                      : done
                        ? "bg-[var(--surface-3)] text-[var(--foreground)]"
                        : "border border-[var(--border)] text-[var(--muted)]"
                  }`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => {
                    if (index <= stepIndex) setStep(s.id);
                  }}
                >
                  {index + 1}. {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === "basics" ? (
        <div className="space-y-5">
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
                placeholder="z.B. Alle Trainer, F2 Eltern"
                required
                disabled={readOnly}
                className="fca-input"
                aria-describedby="zg-name-hint"
              />
              <p id="zg-name-hint" className="mt-1 text-xs text-[var(--muted)]">
                Eindeutiger Anzeigename für diese wiederverwendbare Empfängergruppe.
              </p>
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
              rows={3}
              disabled={readOnly}
              placeholder="Zweck dieser Zielgruppe (empfohlen)"
              className="fca-input resize-none"
            />
          </div>
        </div>
      ) : null}

      {step === "rules" ? (
        <div>
          <p className="mb-4 text-sm text-[var(--text-2)]">
            Wählen Sie strukturelle Kriterien und explizite Personen. Technische IDs oder JSON sind
            nicht nötig.
          </p>
          <ZielgruppeDefinitionEditor
            value={definition}
            onChange={setDefinition}
            knownLabels={mergedLabels}
            disabled={readOnly}
          />
        </div>
      ) : null}

      {step === "preview" ? (
        <ZielgruppePreviewPanel definition={definition} disabled={readOnly} />
      ) : null}

      {step === "review" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Grundlagen</h3>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--muted)]">Name</dt>
                <dd>{name}</dd>
              </div>
              {description ? (
                <div className="sm:col-span-2">
                  <dt className="text-[var(--muted)]">Beschreibung</dt>
                  <dd>{description}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Regeln</h3>
            <div className="mt-2">
              <ZielgruppeHumanRulesPanel definition={definition} labels={mergedLabels} />
            </div>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Änderungen wirken sich auf künftige dynamische Auflösung aus — nicht auf bereits
            versendete Kommunikation mit Empfänger-Snapshot.
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-[var(--radius-xl)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          {stepIndex > 0 ? (
            <button type="button" onClick={goBack} className="fca-button-secondary">
              Zurück
            </button>
          ) : (
            <button type="button" onClick={() => router.back()} className="fca-button-secondary">
              Abbrechen
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {step !== "review" ? (
            <button type="button" onClick={goNext} className="fca-button-primary">
              Weiter
            </button>
          ) : canManage ? (
            <button type="submit" disabled={loading} className="fca-button-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {loading ? "Speichern…" : mode === "create" ? "Zielgruppe erstellen" : "Speichern"}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
