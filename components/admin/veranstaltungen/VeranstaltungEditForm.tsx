"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSurfaceCard from "@/components/admin/shared/AdminSurfaceCard";
import { clubEventScheduleFormFromPersisted } from "@/lib/events/club-event-scheduling";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import VeranstaltungAusspielungFields, {
  type VeranstaltungAusspielungValues,
} from "./VeranstaltungAusspielungFields";
import VeranstaltungScheduleFields, {
  type VeranstaltungScheduleFieldValues,
} from "./VeranstaltungScheduleFields";

type SeasonSummary = {
  id: string;
  key: string;
  name: string;
};

type VeranstaltungEditFormProps = {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startAt: Date | string;
    endAt: Date | string | null;
    allDay: boolean;
    organizerName: string | null;
    remarks: string | null;
    status: string;
    source: string;
    websiteVisible: boolean;
    infoboardVisible: boolean;
    homepageVisible: boolean;
    wochenplanVisible: boolean;
    trainingsplanVisible: boolean;
    teamPageVisible: boolean;
    season: SeasonSummary | null;
  };
  timeZone?: string | null;
};

export default function VeranstaltungEditForm({ event, timeZone }: VeranstaltungEditFormProps) {
  const router = useRouter();
  const tz = resolveTenantEventTimezone(timeZone);

  const isArchived = event.status === "ARCHIVED";
  const isReadonly = isArchived || event.source === "CLUBCORNER_FVNWS";

  const initialSchedule = clubEventScheduleFormFromPersisted(
    {
      allDay: event.allDay,
      startAt: new Date(event.startAt),
      endAt: event.endAt ? new Date(event.endAt) : null,
    },
    tz,
  );

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [schedule, setSchedule] = useState<VeranstaltungScheduleFieldValues>({
    allDay: initialSchedule.allDay,
    startDate: initialSchedule.startDate,
    endDate: initialSchedule.endDate ?? initialSchedule.startDate,
    startTime: initialSchedule.startTime ?? "18:00",
    endTime: initialSchedule.endTime ?? "",
  });
  const rememberedTimes = useRef({
    startTime: initialSchedule.startTime ?? "18:00",
    endTime: initialSchedule.endTime ?? "20:00",
  });

  const [organizerName, setOrganizerName] = useState(event.organizerName ?? "");
  const [remarks, setRemarks] = useState(event.remarks ?? "");
  const [ausspielung, setAusspielung] = useState<VeranstaltungAusspielungValues>({
    websiteVisible: event.websiteVisible,
    homepageVisible: event.homepageVisible,
    wochenplanVisible: event.wochenplanVisible,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleScheduleChange(patch: Partial<VeranstaltungScheduleFieldValues>) {
    setSchedule((current) => {
      if (patch.allDay === true && !current.allDay) {
        rememberedTimes.current = {
          startTime: current.startTime,
          endTime: current.endTime,
        };
        return {
          ...current,
          ...patch,
          endDate: patch.endDate ?? (current.endDate || current.startDate),
        };
      }
      if (patch.allDay === false && current.allDay) {
        return {
          ...current,
          ...patch,
          startTime: rememberedTimes.current.startTime,
          endTime: rememberedTimes.current.endTime,
        };
      }
      return { ...current, ...patch };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isReadonly) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          location: location || null,
          allDay: schedule.allDay,
          startDate: schedule.startDate,
          endDate: schedule.allDay ? schedule.endDate || schedule.startDate : null,
          startTime: schedule.allDay ? null : schedule.startTime,
          endTime: schedule.allDay ? null : schedule.endTime || null,
          organizerName: organizerName || null,
          remarks: remarks || null,
          websiteVisible: ausspielung.websiteVisible,
          homepageVisible: ausspielung.homepageVisible,
          wochenplanVisible: ausspielung.wochenplanVisible,
        }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      router.push("/dashboard/veranstaltungen?updated=1");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminSurfaceCard className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {event.season ? (
          <p className="text-sm text-[var(--muted)]">Saison: {event.season.name}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 md:col-span-2">
            <span className="fca-label">Titel</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="fca-input"
              required
              disabled={isReadonly}
            />
          </label>

          <VeranstaltungScheduleFields
            values={schedule}
            onChange={handleScheduleChange}
            disabled={isReadonly}
          />

          <label className="block space-y-2 md:col-span-2">
            <span className="fca-label">Beschreibung</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="fca-textarea min-h-[120px]"
              disabled={isReadonly}
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Ort</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="fca-input"
              disabled={isReadonly}
            />
          </label>

          <label className="block space-y-2">
            <span className="fca-label">Organisator</span>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className="fca-input"
              disabled={isReadonly}
            />
          </label>

          <label className="block space-y-2 md:col-span-2">
            <span className="fca-label">Bemerkungen</span>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="fca-input"
              disabled={isReadonly}
            />
          </label>
        </div>

        <VeranstaltungAusspielungFields
          values={ausspielung}
          onChange={(patch) => setAusspielung((current) => ({ ...current, ...patch }))}
          disabled={isReadonly}
        />

        {error ? <div className="fca-status-box fca-status-box-error">{error}</div> : null}

        {!isReadonly ? (
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="fca-button-primary">
              {submitting ? "Speichern..." : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/veranstaltungen")}
              className="fca-button-secondary"
            >
              Abbrechen
            </button>
          </div>
        ) : null}
      </form>
    </AdminSurfaceCard>
  );
}
