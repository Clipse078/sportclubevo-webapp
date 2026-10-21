"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import VisibilityScopeSelect, {
  type VisibilityScopeValue,
} from "@/components/admin/shared/VisibilityScopeSelect";
import AllowlistPanel from "@/components/admin/shared/visibility/AllowlistPanel";
import { sceFormSurfaceClasses } from "@/lib/design-system/sce-composer-form-surface";

type MeetingFormProps = {
  mode: "create" | "edit";
  layout?: "page" | "composer";
  onSuccess?: (meetingId: string) => void;
  onCancel?: () => void;
  meetingId?: string;
  defaultValues?: {
    title?: string;
    description?: string;
    meetingDate?: string;
    location?: string;
    attendeeCount?: string;
    status?: string;
    visibilityScope?: VisibilityScopeValue;
    visibleOrgUnitRefs?: string[];
    visibleRoleRefs?: string[];
    visibleUserRefs?: string[];
    visibleTargetGroupRefs?: string[];
  };
};

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Geplant" },
  { value: "COMPLETED", label: "Abgeschlossen" },
  { value: "CANCELLED", label: "Abgesagt" },
] as const;

export default function MeetingForm({
  mode,
  layout = "page",
  onSuccess,
  onCancel,
  meetingId,
  defaultValues,
}: MeetingFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [meetingDate, setMeetingDate] = useState(defaultValues?.meetingDate ?? "");
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [attendeeCount, setAttendeeCount] = useState(defaultValues?.attendeeCount ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "PLANNED");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Titel ist erforderlich.");
      return;
    }
    if (!meetingDate) {
      setError("Datum ist erforderlich.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        meetingDate,
        location: location.trim() || null,
        attendeeCount: attendeeCount ? Number(attendeeCount) : null,
        status,
        visibilityScope,
        visibleOrgUnitRefs: visibilityScope === "RESTRICTED" ? visibleOrgUnitRefs : [],
        visibleRoleRefs: visibilityScope === "RESTRICTED" ? visibleRoleRefs : [],
        visibleUserRefs: visibilityScope === "RESTRICTED" ? visibleUserRefs : [],
        visibleTargetGroupRefs: visibilityScope === "RESTRICTED" ? visibleTargetGroupRefs : [],
      };

      const url = mode === "edit" ? `/api/meetings/${meetingId}` : "/api/meetings";
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
      const slug = typeof data?.meeting?.slug === "string" ? data.meeting.slug : "";
      if (onSuccess) {
        onSuccess(slug);
        return;
      }
      router.push("/vereinsleitung/meetings?status=saved");
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
              placeholder="z.B. Vorstandssitzung Mai"
              className={fieldClass}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Meetings…"
              rows={3}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Datum & Uhrzeit *</label>
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className={fieldClass}
              required
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

          <div>
            <label className={labelClass}>Ort</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Clubhaus, Sitzungszimmer 1"
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Teilnehmeranzahl</label>
            <input
              type="number"
              min={0}
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(e.target.value)}
              placeholder="z.B. 5"
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Sichtbarkeit</h3>
        <p className="mb-5 text-[12px] text-[var(--muted)]">
          Wer kann dieses Meeting sehen? Wähle sorgfältig — Privat und Eingeschränkt
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
          onClick={() => (onCancel ? onCancel() : router.back())}
          className={cancelButtonClass}
        >
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className={submitButtonClass}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Meeting erstellen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
