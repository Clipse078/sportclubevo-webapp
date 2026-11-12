"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PeoplePicker, type PersonPickerResult } from "@/components/shared/PeoplePicker";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import MeetingParticipantMultiPicker from "@/components/admin/meetings/MeetingParticipantMultiPicker";
import { useGuardedComposerCancel } from "@/lib/ux/use-guarded-composer-cancel";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import VisibilityScopeSelect, {
  type VisibilityScopeValue,
} from "@/components/admin/shared/VisibilityScopeSelect";
import AllowlistPanel from "@/components/admin/shared/visibility/AllowlistPanel";
import { sceFormSurfaceClasses } from "@/lib/design-system/sce-composer-form-surface";
import { MeetingApprovalRuleSelect } from "@/components/admin/meetings/approval/meetingApprovalShared";

type ProcessFormProps = {
  mode: "create" | "edit";
  processId?: string;
  defaultValues?: {
    title?: string;
    summary?: string;
    description?: string;
    status?: string;
    owner?: string;
    ownerPersonId?: string;
    visibilityScope?: VisibilityScopeValue;
    visibleOrgUnitRefs?: string[];
    visibleRoleRefs?: string[];
    visibleUserRefs?: string[];
    visibleTargetGroupRefs?: string[];
  };
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Entwurf" },
  { value: "ACTIVE", label: "Aktiv" },
  { value: "ARCHIVED", label: "Archiviert" },
] as const;

export default function ProcessForm({ mode, processId, defaultValues }: ProcessFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [summary, setSummary] = useState(defaultValues?.summary ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "DRAFT");
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
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScopeValue>(
    defaultValues?.visibilityScope ?? "ORGANISATION",
  );
  const [visibleOrgUnitRefs, setVisibleOrgUnitRefs] = useState<string[]>(
    defaultValues?.visibleOrgUnitRefs ?? [],
  );
  const [visibleRoleRefs, setVisibleRoleRefs] = useState<string[]>(defaultValues?.visibleRoleRefs ?? []);
  const [visibleUserRefs, setVisibleUserRefs] = useState<string[]>(defaultValues?.visibleUserRefs ?? []);
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
      visibilityScope,
    }),
    [title, summary, description, status, ownerPerson, visibilityScope],
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
      const ownerLabel =
        ownerPerson?.displayName ||
        [ownerPerson?.firstName, ownerPerson?.lastName].filter(Boolean).join(" ") ||
        null;
      const payload = {
        title: title.trim(),
        summary: summary.trim() || null,
        description: description.trim() || null,
        status,
        owner: ownerLabel,
        ownerPersonId: ownerPerson?.id?.trim() || null,
        approvalRequired,
        approvalRule,
        approverPersonIds: approvalRequired ? approverPersonIds : [],
        visibilityScope,
        visibleOrgUnitRefs: visibilityScope === "RESTRICTED" ? visibleOrgUnitRefs : [],
        visibleRoleRefs: visibilityScope === "RESTRICTED" ? visibleRoleRefs : [],
        visibleUserRefs: visibilityScope === "RESTRICTED" ? visibleUserRefs : [],
        visibleTargetGroupRefs: visibilityScope === "RESTRICTED" ? visibleTargetGroupRefs : [],
      };

      const url =
        mode === "edit"
          ? `/api/club-development/processes/${processId}`
          : "/api/club-development/processes";
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
      const slug = typeof data?.process?.slug === "string" ? data.process.slug : "";
      resetBaseline();
      if (mode === "create" && slug) {
        router.push(`/vereinsleitung/prozesse/${slug}`);
      } else if (slug) {
        router.push(`/vereinsleitung/prozesse/${slug}?status=saved`);
      } else {
        router.push("/vereinsleitung/prozesse");
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
  } = sceFormSurfaceClasses("page");

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="process-form">
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
              className={fieldClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
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
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Sichtbarkeit</h3>
        <VisibilityScopeSelect value={visibilityScope} onChange={setVisibilityScope} />
        {visibilityScope === "RESTRICTED" ? (
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
        ) : null}
      </section>

      {mode === "create" ? (
        <section className={sectionClass}>
          <h3 className={sectionTitleClass}>Freigabe (optional)</h3>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <SwitchThumb
              id="process-approval-required-create"
              checked={approvalRequired}
              onChange={setApprovalRequired}
            />
            Freigabe vor Veröffentlichung erforderlich
          </label>
          {approvalRequired ? (
            <div className="mt-4 space-y-3">
              <MeetingApprovalRuleSelect value={approvalRule} onChange={setApprovalRule} />
              <MeetingParticipantMultiPicker
                label="Prüfer"
                selectedPersonIds={approverPersonIds}
                onSelectedPersonIdsChange={setApproverPersonIds}
              />
              <p className="text-xs text-[var(--muted)]">
                Prüfer und Einreichung können nach dem Erstellen auf der Prozessdetailseite bearbeitet werden.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={submitButtonClass} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "create" ? "Erstellen" : "Speichern"}
        </button>
        <button
          type="button"
          className={cancelButtonClass}
          onClick={() => guardedCancel(() => router.push("/vereinsleitung/prozesse"))}
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}
