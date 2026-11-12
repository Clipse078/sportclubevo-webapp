"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";
import { useGuardedComposerCancel } from "@/lib/ux/use-guarded-composer-cancel";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import VisibilityScopeSelect, {
  type VisibilityScopeValue,
} from "@/components/admin/shared/VisibilityScopeSelect";
import AllowlistPanel from "@/components/admin/shared/visibility/AllowlistPanel";
import { sceFormSurfaceClasses } from "@/lib/design-system/sce-composer-form-surface";
import { SwitchThumb } from "@/components/ui/SwitchToggle";

type InitiativeFormProps = {
  mode: "create" | "edit";
  layout?: "page" | "composer";
  onSuccess?: (initiativeId: string) => void;
  onCancel?: () => void;
  initiativeId?: string;
  defaultValues?: {
    title?: string;
    summary?: string;
    description?: string;
    status?: string;
    owner?: string;
    ownerPersonId?: string;
    dueDate?: string;
    visibilityScope?: VisibilityScopeValue;
    visibleOrgUnitRefs?: string[];
    visibleRoleRefs?: string[];
    visibleUserRefs?: string[];
    visibleTargetGroupRefs?: string[];
  };
};

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Geplant" },
  { value: "IN_PROGRESS", label: "In Arbeit" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "ON_HOLD", label: "Pausiert" },
  { value: "COMPLETED", label: "Abgeschlossen" },
  { value: "CANCELLED", label: "Abgesagt" },
] as const;

export default function InitiativeForm({
  mode,
  layout = "page",
  onSuccess,
  onCancel,
  initiativeId,
  defaultValues,
}: InitiativeFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [summary, setSummary] = useState(defaultValues?.summary ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "PLANNED");
  const [ownerPerson, setOwnerPerson] = useState<PersonPickerResult | null>(
    defaultValues?.ownerPersonId
      ? {
          id: defaultValues.ownerPersonId,
          firstName: "",
          lastName: "",
          displayName: defaultValues.owner ?? null,
          email: null,
          phone: null,
        }
      : defaultValues?.owner
        ? {
            id: "",
            firstName: "",
            lastName: "",
            displayName: defaultValues.owner,
            email: null,
            phone: null,
          }
        : null,
  );
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [approvalRule, setApprovalRule] = useState<"ALL" | "ONE" | "MAJORITY">("ALL");
  const [approverPersonIds, setApproverPersonIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(defaultValues?.dueDate ?? "");
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardedCancel = useGuardedComposerCancel();

  const formSnapshot = useMemo(
    () => ({
      title,
      summary,
      description,
      status,
      ownerPerson,
      approvalRequired,
      dueDate,
      visibilityScope,
      visibleOrgUnitRefs,
      visibleRoleRefs,
      visibleUserRefs,
      visibleTargetGroupRefs,
    }),
    [
      title,
      summary,
      description,
      status,
      ownerPerson,
      approvalRequired,
      dueDate,
      visibilityScope,
      visibleOrgUnitRefs,
      visibleRoleRefs,
      visibleUserRefs,
      visibleTargetGroupRefs,
    ],
  );

  const { resetBaseline } = useSceComposerFormDirty(formSnapshot);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }

    setLoading(true);
    try {
      const ownerLabel = ownerPerson?.displayName
        || [ownerPerson?.firstName, ownerPerson?.lastName].filter(Boolean).join(" ")
        || null;
      const payload = {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        status,
        owner: ownerLabel,
        ownerPersonId: ownerPerson?.id?.trim() || null,
        dueDate: dueDate || null,
        approvalRequired,
        approvalRule,
        approverPersonIds: approvalRequired ? approverPersonIds : [],
        visibilityScope,
        visibleOrgUnitRefs: visibilityScope === "RESTRICTED" ? visibleOrgUnitRefs : [],
        visibleRoleRefs: visibilityScope === "RESTRICTED" ? visibleRoleRefs : [],
        visibleUserRefs: visibilityScope === "RESTRICTED" ? visibleUserRefs : [],
        visibleTargetGroupRefs: visibilityScope === "RESTRICTED" ? visibleTargetGroupRefs : [],
      };

      const url = mode === "edit" ? `/api/initiatives/${initiativeId}` : "/api/initiatives";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Fehler beim Speichern.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      const slug = typeof data?.initiative?.slug === "string" ? data.initiative.slug : "";
      resetBaseline();
      if (onSuccess) {
        onSuccess(slug);
        return;
      }
      if (mode === "create" && slug) {
        router.push(`/vereinsleitung/initiativen/${slug}`);
      } else {
        router.push("/vereinsleitung/initiativen?status=saved");
      }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className={errorClass} role="alert">
          {error}
        </div>
      ) : null}

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Grunddaten</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Website Relaunch"
              className={fieldClass}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Zusammenfassung</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Kurze Zusammenfassung…"
              className={fieldClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ausführliche Beschreibung…"
              rows={4}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Verantwortlich</label>
            <PeoplePicker
              selected={ownerPerson}
              onSelect={setOwnerPerson}
              onClearSelected={() => setOwnerPerson(null)}
              placeholder="Person suchen…"
            />
            {ownerPerson?.id ? null : ownerPerson?.displayName ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Bestehender Freitext-Verantwortlicher: {ownerPerson.displayName}
              </p>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Fällig bis</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      {mode === "create" ? (
        <section className={sectionClass}>
          <h3 className={sectionTitleClass}>Freigabe (optional)</h3>
          <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <SwitchThumb
              id="initiative-create-approval-required"
              checked={approvalRequired}
              onChange={setApprovalRequired}
              aria-label="Freigabe vor Veröffentlichung erforderlich"
            />
            <label htmlFor="initiative-create-approval-required" className="cursor-pointer">
              Freigabe vor Veröffentlichung erforderlich
            </label>
          </div>
          {approvalRequired ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Freigaberegel</label>
                <select
                  className={fieldClass}
                  value={approvalRule}
                  onChange={(e) => setApprovalRule(e.target.value as typeof approvalRule)}
                >
                  <option value="ALL">Alle müssen zustimmen</option>
                  <option value="ONE">Eine Zustimmung reicht</option>
                  <option value="MAJORITY">Mehrheit</option>
                </select>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Prüfer werden nach dem Erstellen auf der Initiative bearbeitet und können eingereicht werden.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Sichtbarkeit</h3>
        <p className="mb-5 text-[12px] text-[var(--muted)]">
          Wer kann diese Initiative sehen? Privat und Eingeschränkt
          verbergen diesen Eintrag für nicht berechtigte Benutzer.
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

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => guardedCancel(() => (onCancel ? onCancel() : router.back()))}
          className={cancelButtonClass}
          data-testid="initiative-form-cancel"
        >
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className={submitButtonClass}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Initiative erstellen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
