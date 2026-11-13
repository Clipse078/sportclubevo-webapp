"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useGuardedComposerCancel } from "@/lib/ux/use-guarded-composer-cancel";
import { useSceComposerFormDirty } from "@/lib/ux/use-sce-composer-form-dirty";
import VisibilityScopeSelect, {
  type VisibilityScopeValue,
} from "@/components/admin/shared/VisibilityScopeSelect";
import AllowlistPanel from "@/components/admin/shared/visibility/AllowlistPanel";
import MeetingParticipantMultiPicker from "@/components/admin/meetings/MeetingParticipantMultiPicker";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import { sceFormSurfaceClasses } from "@/lib/design-system/sce-composer-form-surface";
import {
  parseMeetingLocation,
  serializeMeetingLocation,
  validateMeetingOnlineUrl,
  type MeetingPresenceFormat,
} from "@/lib/meetings/meeting-presence-location";

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
    plannedDurationMin?: string;
    status?: string;
    visibilityScope?: VisibilityScopeValue;
    visibleOrgUnitRefs?: string[];
    visibleRoleRefs?: string[];
    visibleUserRefs?: string[];
    visibleTargetGroupRefs?: string[];
    visibilityHint?: string | null;
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
  const initialPresence = parseMeetingLocation(defaultValues?.location ?? null);
  const [presenceFormat, setPresenceFormat] = useState<MeetingPresenceFormat>(initialPresence.format);
  const [onsiteLocation, setOnsiteLocation] = useState(initialPresence.onsiteLabel ?? "");
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState(initialPresence.onlineUrl ?? "");
  const [plannedDurationMin, setPlannedDurationMin] = useState(defaultValues?.plannedDurationMin ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "PLANNED");
  const [participantPersonIds, setParticipantPersonIds] = useState<string[]>([]);
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScopeValue>(
    defaultValues?.visibilityScope ?? "RESTRICTED",
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
      description,
      meetingDate,
      presenceFormat,
      onsiteLocation,
      onlineMeetingUrl,
      plannedDurationMin,
      status,
      participantPersonIds,
      visibilityScope,
      visibleOrgUnitRefs,
      visibleRoleRefs,
      visibleUserRefs,
      visibleTargetGroupRefs,
    }),
    [
      title,
      description,
      meetingDate,
      presenceFormat,
      onsiteLocation,
      onlineMeetingUrl,
      plannedDurationMin,
      status,
      participantPersonIds,
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
    if (!meetingDate) {
      setError("Datum ist erforderlich.");
      return;
    }

    if (presenceFormat === "ONLINE" || presenceFormat === "HYBRID") {
      if (!onlineMeetingUrl.trim() || !validateMeetingOnlineUrl(onlineMeetingUrl)) {
        setError("Bitte eine gültige HTTPS-Link-URL für die Online-Teilnahme angeben.");
        return;
      }
    }
    if ((presenceFormat === "ONSITE" || presenceFormat === "HYBRID") && !onsiteLocation.trim()) {
      if (presenceFormat === "ONSITE") {
        setError("Bitte einen Ort angeben.");
        return;
      }
    }

    if (visibilityScope === "RESTRICTED") {
      const allowlistCount =
        visibleOrgUnitRefs.length +
        visibleRoleRefs.length +
        visibleUserRefs.length +
        visibleTargetGroupRefs.length;
      if (allowlistCount === 0) {
        setError(
          "Bei eingeschränkter Sichtbarkeit bitte mindestens eine Org.-Einheit, Rolle oder Person auswählen.",
        );
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        meetingDate,
        location: serializeMeetingLocation({
          format: presenceFormat,
          onsiteLabel: onsiteLocation.trim() || null,
          onlineUrl: onlineMeetingUrl.trim() || null,
        }),
        plannedDurationMin: plannedDurationMin ? Number(plannedDurationMin) : null,
        status,
        visibilityScope,
        visibleOrgUnitRefs: visibilityScope === "RESTRICTED" ? visibleOrgUnitRefs : [],
        visibleRoleRefs: visibilityScope === "RESTRICTED" ? visibleRoleRefs : [],
        visibleUserRefs: visibilityScope === "RESTRICTED" ? visibleUserRefs : [],
        visibleTargetGroupRefs: visibilityScope === "RESTRICTED" ? visibleTargetGroupRefs : [],
        participantPersonIds: mode === "create" ? participantPersonIds : undefined,
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
      resetBaseline();
      if (onSuccess) {
        onSuccess(slug);
        return;
      }
      if (slug && mode === "create") {
        router.push(`/vereinsleitung/meetings/${slug}`);
      } else {
        router.push("/vereinsleitung/meetings?status=saved");
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className={errorClass} role="alert">
          {error}
        </div>
      ) : null}

      <section className={sectionClass} data-testid="meeting-form-core">
        <h3 className={sectionTitleClass}>Sitzung</h3>
        <div className="grid gap-3 md:grid-cols-2">
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
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className={labelClass}>Durchführung</label>
              <select
                value={presenceFormat}
                onChange={(e) => setPresenceFormat(e.target.value as MeetingPresenceFormat)}
                className={fieldClass}
                data-testid="meeting-presence-format"
              >
                <option value="ONSITE">Vor Ort</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            {presenceFormat !== "ONLINE" ? (
              <div>
                <label className={labelClass}>Ort {presenceFormat === "ONSITE" ? "*" : ""}</label>
                <input
                  type="text"
                  value={onsiteLocation}
                  onChange={(e) => setOnsiteLocation(e.target.value)}
                  placeholder="z.B. Clubhaus, Sitzungszimmer 1"
                  className={fieldClass}
                  data-testid="meeting-onsite-location"
                />
              </div>
            ) : null}
            {presenceFormat !== "ONSITE" ? (
              <div>
                <label className={labelClass}>Online-Link (HTTPS) *</label>
                <input
                  type="url"
                  value={onlineMeetingUrl}
                  onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                  placeholder="https://…"
                  className={fieldClass}
                  data-testid="meeting-online-url"
                />
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Sitzung…"
              rows={2}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Geplante Dauer (Minuten)</label>
            <input
              type="number"
              min={1}
              value={plannedDurationMin}
              onChange={(e) => setPlannedDurationMin(e.target.value)}
              placeholder="z.B. 90"
              className={fieldClass}
            />
          </div>
          {mode === "create" ? (
            <div className="md:col-span-2">
              <MeetingParticipantMultiPicker
                selectedPersonIds={participantPersonIds}
                onSelectedPersonIdsChange={setParticipantPersonIds}
              />
              <p className="mt-1.5 text-[12px] text-[var(--muted)]">
                Auswahl erfasst Teilnehmer für die Sitzung — Einladungen werden separat vorbereitet, nicht automatisch
                versendet.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <SceExpandablePanel
        defaultOpen={false}
        summary={<span className="text-sm font-semibold text-[var(--foreground)]">Erweiterte Einstellungen</span>}
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Sitzungsstatus (Lebenszyklus)</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Der Freigabe-Workflow für Protokoll und Beschlüsse ist davon getrennt und wird nur bei Bedarf angezeigt.
            </p>
          </div>
          <div>
            <h3 className={sectionTitleClass}>Sichtbarkeit</h3>
            <p className="mb-3 text-[12px] text-[var(--muted)]">
              Wer kann diese Sitzung in der Übersicht sehen? «Eingeschränkt» zeigt den Eintrag nur für berechtigte
              Personen — nicht automatisch für den ganzen Verein. Teilnehmerauswahl steuert nicht die Sichtbarkeit.
            </p>
            {defaultValues?.visibilityHint ? (
              <p className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[12px] text-[var(--text-2)]">
                {defaultValues.visibilityHint}
              </p>
            ) : null}
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
          </div>
        </div>
      </SceExpandablePanel>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => guardedCancel(() => (onCancel ? onCancel() : router.back()))}
          className={cancelButtonClass}
          data-testid="meeting-form-cancel"
        >
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className={submitButtonClass}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? "Sitzung erstellen" : "Änderungen speichern"}
        </button>
      </div>
    </form>
  );
}
