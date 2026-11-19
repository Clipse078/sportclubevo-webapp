"use client";

import { useState, useTransition } from "react";
import type { ClubMeldungStatus } from "@prisma/client";
import { CLUB_MELDUNG_STATUS_LABELS } from "@/lib/club-meldungen/copy";

type Props = {
  tenantSlug: string;
  meldungId: string;
  version: number;
  status: ClubMeldungStatus;
  accountableUserId: string | null;
  actorUserId: string;
};

const STATUS_OPTIONS: ClubMeldungStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "WAITING",
  "DONE",
];

export default function ClubMeldungHandlerPanel({
  tenantSlug,
  meldungId,
  version,
  status,
  accountableUserId,
  actorUserId,
}: Props) {
  const [currentVersion, setCurrentVersion] = useState(version);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [waitReason, setWaitReason] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [duplicateOfId, setDuplicateOfId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function patchStatus(nextStatus: ClubMeldungStatus) {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/tenants/${tenantSlug}/meldungen/${meldungId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedVersion: currentVersion,
        status: nextStatus,
        waitReason: nextStatus === "WAITING" ? waitReason : undefined,
        resolutionSummary: nextStatus === "DONE" ? resolutionSummary : undefined,
        reopenReason:
          currentStatus === "DONE" && nextStatus !== "DONE" ? reopenReason : undefined,
        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Status konnte nicht gespeichert werden.");
      return;
    }
    setCurrentVersion(payload.meldung.version);
    setCurrentStatus(payload.meldung.status);
    setNotice("Status gespeichert.");
  }

  function claimSelf() {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const response = await fetch(
        `/api/tenants/${tenantSlug}/meldungen/${meldungId}/assign`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: currentVersion,
            accountableUserId: actorUserId,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Zuweisung fehlgeschlagen.");
        return;
      }
      setCurrentVersion(payload.meldung.version);
      setNotice("Du bist jetzt verantwortlich.");
      window.location.reload();
    });
  }

  function linkDuplicate() {
    if (!duplicateOfId.trim()) return;
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const response = await fetch(
        `/api/tenants/${tenantSlug}/meldungen/${meldungId}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: currentVersion,
            duplicateOfId: duplicateOfId.trim(),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Duplikat konnte nicht verknüpft werden.");
        return;
      }
      setCurrentVersion(payload.meldung.version);
      setNotice("Als Duplikat markiert.");
      window.location.reload();
    });
  }

  function createLinkedTask() {
    if (!taskTitle.trim()) return;
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const response = await fetch(
        `/api/tenants/${tenantSlug}/meldungen/${meldungId}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: taskTitle.trim() }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Aufgabe konnte nicht erstellt werden.");
        return;
      }
      setTaskTitle("");
      setNotice(`Aufgabe erstellt (${payload.task.id}).`);
    });
  }

  return (
    <section
      className="rounded-md border border-slate-200 bg-white p-4"
      aria-label="Bearbeitung"
    >
      <h2 className="text-sm font-semibold text-slate-900">Bearbeitung</h2>
      <p className="mt-1 text-xs text-slate-600">
        Aktuell: {CLUB_MELDUNG_STATUS_LABELS[currentStatus]}
        {accountableUserId ? "" : " · noch ohne Verantwortliche"}
      </p>

      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-2 text-sm text-emerald-800">{notice}</p> : null}

      {!accountableUserId ? (
        <button
          type="button"
          disabled={pending}
          onClick={claimSelf}
          className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Übernehmen
        </button>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Neuer Status
          <select
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            value={currentStatus}
            onChange={(event) => setCurrentStatus(event.target.value as ClubMeldungStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CLUB_MELDUNG_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Wiedervorlage / Follow-up
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            value={followUpAt}
            onChange={(event) => setFollowUpAt(event.target.value)}
          />
        </label>
      </div>

      {currentStatus === "WAITING" ? (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Wartegrund
          <textarea
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            rows={2}
            value={waitReason}
            onChange={(event) => setWaitReason(event.target.value)}
          />
        </label>
      ) : null}

      {currentStatus === "DONE" ? (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Erledigt — Zusammenfassung
          <textarea
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            rows={2}
            value={resolutionSummary}
            onChange={(event) => setResolutionSummary(event.target.value)}
          />
        </label>
      ) : null}

      {status === "DONE" && currentStatus !== "DONE" ? (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Wiedereröffnen — Grund
          <textarea
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            rows={2}
            value={reopenReason}
            onChange={(event) => setReopenReason(event.target.value)}
          />
        </label>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => patchStatus(currentStatus))}
        className="mt-3 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 disabled:opacity-50"
      >
        Status speichern
      </button>

      <hr className="my-4 border-slate-100" />

      <label className="block text-xs font-medium text-slate-600">
        Duplikat von (Meldungs-ID)
        <input
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1 font-mono text-sm"
          value={duplicateOfId}
          onChange={(event) => setDuplicateOfId(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={pending || !duplicateOfId.trim()}
        onClick={linkDuplicate}
        className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
      >
        Als Duplikat verknüpfen
      </button>

      <hr className="my-4 border-slate-100" />

      <label className="block text-xs font-medium text-slate-600">
        Verknüpfte Aufgabe
        <input
          className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
          value={taskTitle}
          onChange={(event) => setTaskTitle(event.target.value)}
          placeholder="Titel der Aufgabe"
        />
      </label>
      <button
        type="button"
        disabled={pending || !taskTitle.trim()}
        onClick={createLinkedTask}
        className="mt-2 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
      >
        Aufgabe anlegen
      </button>
    </section>
  );
}