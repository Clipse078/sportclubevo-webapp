"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGuardedComposerCancel } from "@/lib/ux/use-guarded-composer-cancel";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import { Plus, Trash2, Loader2 } from "lucide-react";
import VisibilityScopeSelect, {
  type VisibilityScopeValue,
} from "@/components/admin/shared/VisibilityScopeSelect";
import AllowlistPanel from "@/components/admin/shared/visibility/AllowlistPanel";
import { sceFormSurfaceClasses } from "@/lib/design-system/sce-composer-form-surface";
import {
  PLANNING_EDITOR_STICKY_FOOTER_CLASS,
  PLANNING_EDITOR_STICKY_FOOTER_RESERVE_CLASS,
} from "@/components/admin/shared/planning-editor/planning-editor-layout";
import {
  parseTargetMetricNumericInput,
} from "@/lib/targets/target-metric-payload";
import TaskDescriptionFormField from "@/components/admin/aufgaben/TaskDescriptionFormField";

type MetricDraft = {
  id?: string;
  label: string;
  type: "PERCENTAGE" | "NUMERIC" | "CURRENCY" | "BOOLEAN";
  direction: "INCREASE" | "DECREASE" | "MAINTAIN";
  targetValue: string;
  currentValue: string;
  unit: string;
  notes: string;
};

type TargetFormProps = {
  mode: "create" | "edit";
  layout?: "page" | "composer";
  onSuccess?: (targetId: string, meta?: { title: string }) => void | Promise<void>;
  onCancel?: () => void;
  targetId?: string;
  defaultValues?: {
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    period?: string;
    periodLabel?: string;
    moduleKey?: string;
    sportCategory?: string;
    ageGroupHint?: string;
    visibilityScope?: VisibilityScopeValue;
    visibleOrgUnitRefs?: string[];
    visibleRoleRefs?: string[];
    visibleUserRefs?: string[];
    visibleTargetGroupRefs?: string[];
    startsAt?: string;
    endsAt?: string;
    metrics?: MetricDraft[];
  };
};

const CATEGORIES = [
  { value: "SPORTLICHE_ENTWICKLUNG", label: "Sportliche Entwicklung" },
  { value: "MITGLIEDERWACHSTUM", label: "Mitgliederwachstum" },
  { value: "FINANZEN", label: "Finanzen & Infrastruktur" },
  { value: "AUSBILDUNG", label: "Ausbildung" },
  { value: "MEDIEN_SOZIALES", label: "Medien & Soziales" },
  { value: "GOVERNANCE", label: "Vereinsführung" },
] as const;

const STATUSES = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "DRAFT", label: "Entwurf" },
  { value: "PAUSED", label: "Pausiert" },
  { value: "COMPLETED", label: "Abgeschlossen" },
  { value: "CANCELLED", label: "Abgebrochen" },
] as const;

const PERIODS = [
  { value: "SEASON", label: "Saison" },
  { value: "QUARTER", label: "Quartal" },
  { value: "YEAR", label: "Jahr" },
  { value: "CUSTOM", label: "Benutzerdefiniert" },
] as const;

const METRIC_TYPES = [
  { value: "PERCENTAGE", label: "Prozent (%)" },
  { value: "NUMERIC", label: "Numerisch" },
  { value: "CURRENCY", label: "Währung (CHF)" },
  { value: "BOOLEAN", label: "Ja/Nein" },
] as const;

const DIRECTIONS = [
  { value: "INCREASE", label: "↑ Erhöhen" },
  { value: "DECREASE", label: "↓ Senken" },
  { value: "MAINTAIN", label: "→ Halten" },
] as const;

function emptyMetric(): MetricDraft {
  return {
    label: "",
    type: "PERCENTAGE",
    direction: "INCREASE",
    targetValue: "",
    currentValue: "",
    unit: "",
    notes: "",
  };
}

function buildMetricPayloadForSubmit(metrics: MetricDraft[]) {
  const errors: string[] = [];
  const payload = metrics
    .filter((m) => m.label.trim())
    .map((m, idx) => {
      const targetValue = parseTargetMetricNumericInput(m.targetValue);
      const currentValue = parseTargetMetricNumericInput(m.currentValue);
      const label = m.label.trim();

      if (targetValue === null) {
        errors.push(`Kennzahl „${label}“: Zielwert ist erforderlich (0 ist gültig).`);
      }
      if (currentValue === null) {
        errors.push(`Kennzahl „${label}“: Aktueller Wert ist erforderlich (0 ist gültig).`);
      }

      return {
        id: m.id,
        label,
        type: m.type,
        direction: m.direction,
        targetValue,
        currentValue,
        unit: m.unit.trim() || null,
        notes: m.notes.trim() || null,
        sortOrder: idx,
      };
    })
    .filter((m) => m.targetValue !== null && m.currentValue !== null)
    .map((m) => ({
      ...m,
      targetValue: m.targetValue as number,
      currentValue: m.currentValue as number,
    }));

  return { payload, error: errors[0] ?? null };
}

export default function TargetForm({
  mode,
  layout = "page",
  onSuccess,
  onCancel,
  targetId,
  defaultValues,
}: TargetFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [category, setCategory] = useState(defaultValues?.category ?? "SPORTLICHE_ENTWICKLUNG");
  const [status, setStatus] = useState(defaultValues?.status ?? "ACTIVE");
  const [period, setPeriod] = useState(defaultValues?.period ?? "SEASON");
  const [periodLabel, setPeriodLabel] = useState(defaultValues?.periodLabel ?? "");
  const moduleKey = defaultValues?.moduleKey ?? "";
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScopeValue>(
    defaultValues?.visibilityScope ?? "ORGANISATION",
  );
  const [visibleOrgUnitRefs, setVisibleOrgUnitRefs] = useState<string[]>(
    defaultValues?.visibleOrgUnitRefs ?? [],
  );
  const [visibleRoleRefs, setVisibleRoleRefs] = useState<string[]>(
    defaultValues?.visibleRoleRefs ?? [],
  );
  const [visibleUserRefs, setVisibleUserRefs] = useState<string[]>(
    defaultValues?.visibleUserRefs ?? [],
  );
  const [visibleTargetGroupRefs, setVisibleTargetGroupRefs] = useState<string[]>(
    defaultValues?.visibleTargetGroupRefs ?? [],
  );
  const [sportCategory, setSportCategory] = useState(defaultValues?.sportCategory ?? "");
  const [ageGroupHint, setAgeGroupHint] = useState(defaultValues?.ageGroupHint ?? "");
  const [startsAt, setStartsAt] = useState(defaultValues?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(defaultValues?.endsAt ?? "");
  const [metrics, setMetrics] = useState<MetricDraft[]>(
    defaultValues?.metrics && defaultValues.metrics.length > 0
      ? defaultValues.metrics
      : [emptyMetric()],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardedCancel = useGuardedComposerCancel();

  const formSnapshot = useMemo(
    () => ({
      title,
      description,
      category,
      status,
      period,
      periodLabel,
      sportCategory,
      ageGroupHint,
      startsAt,
      endsAt,
      visibilityScope,
      visibleOrgUnitRefs,
      visibleRoleRefs,
      visibleUserRefs,
      visibleTargetGroupRefs,
      metrics,
    }),
    [
      title,
      description,
      category,
      status,
      period,
      periodLabel,
      sportCategory,
      ageGroupHint,
      startsAt,
      endsAt,
      visibilityScope,
      visibleOrgUnitRefs,
      visibleRoleRefs,
      visibleUserRefs,
      visibleTargetGroupRefs,
      metrics,
    ],
  );

  const { resetBaseline } = useSceComposerFormDirty(formSnapshot);

  function addMetric() {
    setMetrics((prev) => [...prev, emptyMetric()]);
  }

  function removeMetric(idx: number) {
    setMetrics((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMetric<K extends keyof MetricDraft>(idx: number, key: K, val: MetricDraft[K]) {
    setMetrics((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: val } : m)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }

    const { payload: metricPayload, error: metricError } = buildMetricPayloadForSubmit(metrics);
    if (metricError) {
      setError(metricError);
      document.getElementById("kennzahlen")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        status,
        period,
        periodLabel: periodLabel.trim() || null,
        moduleKey: moduleKey.trim() || null,
        sportCategory: sportCategory.trim() || null,
        ageGroupHint: ageGroupHint.trim() || null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        visibilityScope,
        visibleOrgUnitRefs: visibilityScope === "RESTRICTED" ? visibleOrgUnitRefs : [],
        visibleRoleRefs: visibilityScope === "RESTRICTED" ? visibleRoleRefs : [],
        visibleUserRefs: visibilityScope === "RESTRICTED" ? visibleUserRefs : [],
        visibleTargetGroupRefs: visibilityScope === "RESTRICTED" ? visibleTargetGroupRefs : [],
        metrics: metricPayload,
      };

      const url = mode === "edit" ? `/api/targets/${targetId}` : "/api/targets";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data?.error ?? "Fehler beim Speichern.";
        setError(message);
        if (res.status === 400 && /Kennzahl/.test(String(message))) {
          document.getElementById("kennzahlen")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const data = await res.json();
      const id = data?.target?.id ?? targetId ?? "";
      const savedTitle =
        typeof data?.target?.title === "string" ? data.target.title : title.trim();
      resetBaseline();
      if (onSuccess) {
        await onSuccess(id, { title: savedTitle });
        return;
      }
      router.push(`/vereinsleitung/targets/${id}?status=saved`);
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  const {
    fieldClass,
    labelClass,
    sectionClass,
    sectionTitleClass,
    errorClass,
    cancelButtonClass,
    submitButtonClass,
  } = sceFormSurfaceClasses(layout);

  const stickyFormClass =
    layout === "page" ? `space-y-6 ${PLANNING_EDITOR_STICKY_FOOTER_RESERVE_CLASS}` : "space-y-6";

  return (
    <form onSubmit={handleSubmit} className={stickyFormClass}>
      {error ? (
        <div className={errorClass} role="alert" data-testid="target-form-error">
          {error}
        </div>
      ) : null}

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>
          Grunddaten
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Frauenfussball ausbauen"
              className={fieldClass}
              required
            />
          </div>

          <div className="md:col-span-2">
            <TaskDescriptionFormField
              label="Beschreibung"
              optional
              initialStored={defaultValues?.description ?? null}
              inputId="target-form-description"
              onSerializedChange={setDescription}
            />
          </div>

          <div>
            <label className={labelClass}>Kategorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClass}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Zeitraum</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={fieldClass}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Zeitraumbezeichnung</label>
            <input
              type="text"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="z.B. Saison 2025/26"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Start</label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Ende</label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Sportkategorie</label>
            <input
              type="text"
              value={sportCategory}
              onChange={(e) => setSportCategory(e.target.value)}
              placeholder="z.B. Fussball"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Altersgruppe (Hinweis)</label>
            <input
              type="text"
              value={ageGroupHint}
              onChange={(e) => setAgeGroupHint(e.target.value)}
              placeholder="z.B. U10–U17"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section id="kennzahlen" className={sectionClass} data-testid="target-form-kennzahlen-section">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-[1.05rem] font-semibold text-[var(--foreground)]">Kennzahlen</h3>
          <button
            type="button"
            onClick={addMetric}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            data-testid="target-form-add-metric"
          >
            <Plus className="h-3.5 w-3.5" />
            Kennzahl hinzufügen
          </button>
        </div>

        {error && /Kennzahl/.test(error) ? (
          <div className={`${errorClass} mb-4`} role="alert">
            {error}
          </div>
        ) : null}

        <p className="mb-4 text-[12px] text-[var(--muted)]">
          Kennzahlen werden mit dem Ziel über „Änderungen speichern“ unten gesichert.
        </p>

        <div className="space-y-5">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="rounded-[20px] border border-[var(--border)]/80 bg-[var(--surface-2)] p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Kennzahl {idx + 1}
                </p>
                {metrics.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeMetric(idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Kennzahl entfernen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Bezeichnung *</label>
                  <input
                    type="text"
                    value={metric.label}
                    onChange={(e) => updateMetric(idx, "label", e.target.value)}
                    placeholder="z.B. Aktive Spielerinnen"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Typ</label>
                  <select
                    value={metric.type}
                    onChange={(e) => updateMetric(idx, "type", e.target.value as MetricDraft["type"])}
                    className={fieldClass}
                  >
                    {METRIC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Richtung</label>
                  <select
                    value={metric.direction}
                    onChange={(e) => updateMetric(idx, "direction", e.target.value as MetricDraft["direction"])}
                    className={fieldClass}
                  >
                    {DIRECTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Zielwert</label>
                  <input
                    type="number"
                    step="any"
                    value={metric.targetValue}
                    onChange={(e) => updateMetric(idx, "targetValue", e.target.value)}
                    placeholder="0"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Aktueller Wert</label>
                  <input
                    type="number"
                    step="any"
                    value={metric.currentValue}
                    onChange={(e) => updateMetric(idx, "currentValue", e.target.value)}
                    placeholder="0"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Einheit</label>
                  <input
                    type="text"
                    value={metric.unit}
                    onChange={(e) => updateMetric(idx, "unit", e.target.value)}
                    placeholder="z.B. %, CHF, Personen"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Notizen</label>
                  <input
                    type="text"
                    value={metric.notes}
                    onChange={(e) => updateMetric(idx, "notes", e.target.value)}
                    placeholder="Optionale Erläuterung…"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="mb-2 text-[1.05rem] font-semibold text-[var(--foreground)]">Sichtbarkeit</h3>
        <p className="mb-5 text-[12px] text-[var(--muted)]">
          Wer kann dieses Ziel sehen? Privat und Eingeschränkt verbergen den Eintrag
          für nicht berechtigte Benutzer.
        </p>
        <VisibilityScopeSelect value={visibilityScope} onChange={setVisibilityScope} />
        <AllowlistPanel
          visibilityScope={visibilityScope}
          visibleOrgUnitRefs={visibleOrgUnitRefs}
          visibleRoleRefs={visibleRoleRefs}
          visibleUserRefs={visibleUserRefs}
          visibleTargetGroupRefs={visibleTargetGroupRefs}
          onOrgUnitsChange={setVisibleOrgUnitRefs}
          onRolesChange={setVisibleRoleRefs}
          onUsersChange={setVisibleUserRefs}
          onTargetGroupsChange={setVisibleTargetGroupRefs}
        />
      </section>

      {layout === "page" && error ? (
        <div className={`${errorClass} mb-2`} role="alert">
          {error}
        </div>
      ) : null}

      <div
        className={
          layout === "page"
            ? PLANNING_EDITOR_STICKY_FOOTER_CLASS
            : "flex items-center justify-between gap-4"
        }
        data-testid="target-form-actions"
      >
        <button
          type="button"
          onClick={() => guardedCancel(() => (onCancel ? onCancel() : router.back()))}
          className={cancelButtonClass}
          data-testid="target-form-cancel"
        >
          Abbrechen
        </button>

        <button
          type="submit"
          disabled={loading}
          className={submitButtonClass}
          data-testid="target-form-submit"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Ziel erstellen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
