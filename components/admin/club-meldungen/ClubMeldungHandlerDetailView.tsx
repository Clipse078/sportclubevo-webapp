"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { ClubMeldungCategory, ClubMeldungStatus } from "@prisma/client";
import SceClubDevelopmentSectionShell from "@/components/admin/club-development/SceClubDevelopmentSectionShell";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "@/components/admin/club-development/sce-club-development-surface-styles";
import {
  CLUB_MELDUNG_CATEGORY_LABELS,
  CLUB_MELDUNG_STATUS_LABELS,
} from "@/lib/club-meldungen/copy";
import type { ClubMeldungAssignOptions } from "@/lib/club-meldungen/assign-lookup";
import { buildClubMeldungHandlerTimeline } from "@/lib/club-meldungen/timeline";
import { cn } from "@/lib/cn";
import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";
import { ClubMeldungMessageBody } from "@/components/admin/club-meldungen/ClubMeldungMessageBody";
import { ClubMeldungReplyComposer } from "@/components/admin/club-meldungen/ClubMeldungReplyComposer";
import { ClubMeldungAssigneePicker } from "@/components/admin/club-meldungen/ClubMeldungAssigneePicker";
import { meldungMentionDisplayName } from "@/lib/club-meldungen/meldung-mention-tokens";

type Message = {
  id: string;
  body: string;
  audience: "REPORTER_REPLY" | "INTERNAL_NOTE";
  createdAt: string;
  author: { firstName: string; lastName: string };
  mentions?: Array<{ userId: string; displayName: string }>;
};

type HistoryEvent = {
  id: string;
  eventType:
    | "CREATED"
    | "STATUS_CHANGED"
    | "ASSIGNED"
    | "REASSIGNED"
    | "WAIT_REASON_SET"
    | "RESOLUTION_RECORDED"
    | "REOPENED"
    | "DUPLICATE_MARKED"
    | "FIELD_UPDATED"
    | "COLLABORATOR_ADDED"
    | "COLLABORATOR_REMOVED"
    | "REPORTER_MESSAGE"
    | "HANDLER_MESSAGE_TO_REPORTER";
  createdAt: string;
  actor: { firstName: string; lastName: string };
  payloadJson: unknown;
};

type Attachment = {
  id: string;
  originalFilename: string;
};

type Props = {
  tenantSlug: string;
  meldungId: string;
  version: number;
  canMutate: boolean;
  actorUserId: string;
  caseNumber: string;
  subject: string;
  description: string;
  category: ClubMeldungCategory;
  status: ClubMeldungStatus;
  locationHint: string | null;
  urgent: boolean;
  resolutionSummary: string | null;
  waitReason: string | null;
  followUpAt: string | null;
  nextStep: string | null;
  accountableUser: { id: string; firstName: string; lastName: string } | null;
  orgUnit: { id: string; name: string } | null;
  reporterUser: { id: string; firstName: string; lastName: string };
  createdAt: string;
  createdByUser: { id: string; firstName: string; lastName: string } | null;
  mentionsEnabled?: boolean;
  duplicateOf: { id: string; caseNumber: string } | null;
  attachments: Attachment[];
  messages: Message[];
  history: HistoryEvent[];
  assignOptions?: ClubMeldungAssignOptions | null;
};

type ActivePanel = "assign" | "status" | "task" | "duplicate" | "more" | null;
type ActivityFilter = "all" | "comments" | "events";

const STATUS_OPTIONS: ClubMeldungStatus[] = ["RECEIVED", "IN_PROGRESS", "WAITING", "DONE"];

export default function ClubMeldungHandlerDetailView(props: Props) {
  const [currentVersion, setCurrentVersion] = useState(props.version);
  const [currentStatus, setCurrentStatus] = useState(props.status);
  const [storedResolution, setStoredResolution] = useState(props.resolutionSummary);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [replyDraftReporter, setReplyDraftReporter] = useState("");
  const [replyDraftInternal, setReplyDraftInternal] = useState("");
  const [messageAudience, setMessageAudience] = useState<"REPORTER_REPLY" | "INTERNAL_NOTE">(
    "INTERNAL_NOTE",
  );
  const [internalMentionedUserIds, setInternalMentionedUserIds] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [waitReason, setWaitReason] = useState(props.waitReason ?? "");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [followUpAt, setFollowUpAt] = useState(
    props.followUpAt ? props.followUpAt.slice(0, 16) : "",
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [duplicateQuery, setDuplicateQuery] = useState("");
  const [duplicateResults, setDuplicateResults] = useState<
    Array<{ id: string; caseNumber: string; subject: string }>
  >([]);
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<string | null>(null);
  const [assignOrgUnitId, setAssignOrgUnitId] = useState<string | null>(props.orgUnit?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const timeline = useMemo(
    () => buildClubMeldungHandlerTimeline(props.messages, props.history),
    [props.history, props.messages],
  );

  function togglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel((current) => {
      const next = current === panel ? null : panel;
      if (next === "assign") {
        setAssignOrgUnitId(props.orgUnit?.id ?? null);
      }
      return next;
    });
    setError(null);
    setNotice(null);
  }

  async function patchStatus(nextStatus: ClubMeldungStatus) {
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/tenants/${props.tenantSlug}/meldungen/${props.meldungId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedVersion: currentVersion,
        status: nextStatus,
        waitReason: nextStatus === "WAITING" ? waitReason : undefined,
        resolutionSummary: nextStatus === "DONE" ? resolutionSummary : undefined,
        reopenReason:
          props.status === "DONE" && nextStatus !== "DONE" ? reopenReason : undefined,
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
    if (payload.meldung.resolutionSummary) {
      setStoredResolution(payload.meldung.resolutionSummary);
    }
    setNotice("Status gespeichert.");
    if (nextStatus === "DONE") setResolutionSummary("");
  }

  function saveAssignment(accountableUserId: string | null, orgUnitId: string | null) {
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const response = await fetch(
        `/api/tenants/${props.tenantSlug}/meldungen/${props.meldungId}/assign`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: currentVersion,
            accountableUserId,
            orgUnitId,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Zuweisung fehlgeschlagen.");
        return;
      }
      setCurrentVersion(payload.meldung.version);
      setNotice("Zuständigkeit gespeichert.");
      window.location.reload();
    });
  }

  function claimSelf() {
    saveAssignment(props.actorUserId, assignOrgUnitId ?? props.orgUnit?.id ?? null);
  }

  function submitOrgUnitOnly() {
    saveAssignment(props.accountableUser?.id ?? null, assignOrgUnitId);
  }

  function assignFromSidebar(accountableUserId: string | null) {
    saveAssignment(accountableUserId, props.orgUnit?.id ?? assignOrgUnitId ?? null);
  }

  function sendMessage() {
    const body = messageAudience === "INTERNAL_NOTE" ? replyDraftInternal : replyDraftReporter;
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/tenants/${props.tenantSlug}/meldungen/${props.meldungId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            audience: messageAudience,
            mentionedUserIds:
              messageAudience === "INTERNAL_NOTE" && props.mentionsEnabled
                ? internalMentionedUserIds
                : undefined,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Senden fehlgeschlagen");
        return;
      }
      if (messageAudience === "INTERNAL_NOTE") {
        setReplyDraftInternal("");
        setInternalMentionedUserIds([]);
      } else {
        setReplyDraftReporter("");
      }
      window.location.reload();
    });
  }

  function createLinkedTask() {
    if (!taskTitle.trim()) return;
    startTransition(async () => {
      setError(null);
      const response = await fetch(
        `/api/tenants/${props.tenantSlug}/meldungen/${props.meldungId}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: taskTitle.trim(),
            description: taskDescription.trim() || null,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Aufgabe konnte nicht erstellt werden.");
        return;
      }
      setTaskTitle("");
      setTaskDescription("");
      setNotice("Aufgabe erstellt.");
      setActivePanel(null);
    });
  }

  function searchDuplicates() {
    if (duplicateQuery.trim().length < 2) return;
    startTransition(async () => {
      setError(null);
      const params = new URLSearchParams({
        q: duplicateQuery.trim(),
        exclude: props.meldungId,
      });
      const response = await fetch(
        `/api/tenants/${props.tenantSlug}/meldungen/lookup?${params.toString()}`,
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Suche fehlgeschlagen.");
        return;
      }
      setDuplicateResults(payload.items ?? []);
    });
  }

  function linkDuplicate() {
    if (!selectedDuplicateId) return;
    startTransition(async () => {
      setError(null);
      const response = await fetch(
        `/api/tenants/${props.tenantSlug}/meldungen/${props.meldungId}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: currentVersion,
            duplicateOfId: selectedDuplicateId,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Duplikat konnte nicht verknüpft werden.");
        return;
      }
      setCurrentVersion(payload.meldung.version);
      window.location.reload();
    });
  }

  const activeReplyDraft =
    messageAudience === "INTERNAL_NOTE" ? replyDraftInternal : replyDraftReporter;
  const setActiveReplyDraft =
    messageAudience === "INTERNAL_NOTE" ? setReplyDraftInternal : setReplyDraftReporter;

  const filteredTimeline = useMemo(() => {
    if (activityFilter === "all") return timeline;
    if (activityFilter === "comments") {
      return timeline.filter((entry) => entry.kind === "message");
    }
    return timeline.filter((entry) => entry.kind === "history");
  }, [activityFilter, timeline]);

  const reporterDiffersFromCreator =
    props.createdByUser != null && props.createdByUser.id !== props.reporterUser.id;

  function personDisplayName(person: { firstName: string; lastName: string }) {
    return meldungMentionDisplayName(person.firstName, person.lastName);
  }

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      data-testid="club-meldung-handler-detail"
    >
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{props.subject}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-2)]">
          <span className="font-mono text-xs tracking-wide text-[var(--muted)]">
            {props.caseNumber}
          </span>
          <span aria-hidden="true">·</span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
            {CLUB_MELDUNG_STATUS_LABELS[currentStatus]}
          </span>
        </div>
        <p className="text-sm text-[var(--text-2)]">
          {CLUB_MELDUNG_CATEGORY_LABELS[props.category]}
          {props.locationHint ? ` · ${props.locationHint}` : ""}
          {props.urgent ? " · Dringend gemeldet" : ""}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <SceClubDevelopmentSectionShell title="Ursprüngliche Meldung">
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{props.description}</p>
            {props.attachments.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
                {props.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <Link
                      href={`/api/tenants/${props.tenantSlug}/meldungen/attachments/${attachment.id}/download`}
                      className="text-sm text-[var(--sce-primary)] hover:underline"
                    >
                      {attachment.originalFilename}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </SceClubDevelopmentSectionShell>

          {storedResolution && currentStatus === "DONE" ? (
            <SceClubDevelopmentSectionShell title="Abschluss">
              <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
                {storedResolution}
              </p>
            </SceClubDevelopmentSectionShell>
          ) : null}

          <SceClubDevelopmentSectionShell title="Aktivität">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Aktivitätsfilter"
            >
              {(
                [
                  ["all", "Alle"],
                  ["comments", "Kommentare"],
                  ["events", "Aktivitäten"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activityFilter === key}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium",
                    activityFilter === key
                      ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
                      : "border-[var(--border)] text-[var(--foreground)]",
                  )}
                  onClick={() => setActivityFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {props.canMutate ? (
              <div className="mt-4 space-y-3 border-b border-[var(--border)] pb-4">
                <p className="text-xs font-medium text-[var(--text-2)]">Modus</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Nachrichtenmodus">
                  <button
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium",
                      messageAudience === "INTERNAL_NOTE"
                        ? "border-amber-700 bg-amber-700 text-white"
                        : "border-[var(--border)] text-[var(--foreground)]",
                    )}
                    onClick={() => setMessageAudience("INTERNAL_NOTE")}
                  >
                    Interner Kommentar
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium",
                      messageAudience === "REPORTER_REPLY"
                        ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
                        : "border-[var(--border)] text-[var(--foreground)]",
                    )}
                    onClick={() => setMessageAudience("REPORTER_REPLY")}
                  >
                    Antwort an meldende Person
                  </button>
                </div>
                <ClubMeldungReplyComposer
                  tenantSlug={props.tenantSlug}
                  meldungId={props.meldungId}
                  audience={messageAudience}
                  mentionsEnabled={props.mentionsEnabled}
                  disabled={!props.canMutate}
                  body={activeReplyDraft}
                  onBodyChange={setActiveReplyDraft}
                  mentionedUserIds={internalMentionedUserIds}
                  onMentionedUserIdsChange={setInternalMentionedUserIds}
                  onSubmit={sendMessage}
                  pending={pending}
                  error={error}
                />
              </div>
            ) : null}

            <ul className="mt-4 space-y-2" aria-label="Aktivität">
              {filteredTimeline.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">Noch keine Einträge in dieser Ansicht.</li>
              ) : (
                filteredTimeline.map((entry) => {
                  if (entry.kind === "history") {
                    const { presentation } = entry;
                    return (
                      <li
                        key={entry.id}
                        className="border-b border-[var(--border)]/80 py-1.5 text-xs text-[var(--text-2)] last:border-b-0"
                      >
                        <p>
                          <span className="text-[var(--muted)]">
                            {new Date(entry.at).toLocaleString("de-CH")}
                          </span>
                          <span aria-hidden="true" className="mx-1.5">
                            ·
                          </span>
                          <span className="font-medium text-[var(--foreground)]">
                            {presentation.label}
                          </span>
                          <span aria-hidden="true" className="mx-1.5">
                            ·
                          </span>
                          <span>{presentation.actorName}</span>
                        </p>
                        {presentation.detail ? (
                          <p className="mt-0.5 whitespace-pre-wrap text-[var(--muted)]">
                            {presentation.detail}
                          </p>
                        ) : null}
                      </li>
                    );
                  }
                  const message = entry.message;
                  const internal = message.audience === "INTERNAL_NOTE";
                  return (
                    <li
                      key={entry.id}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm",
                        internal
                          ? "border-amber-200/80 bg-amber-50/50"
                          : "border-[var(--border)] bg-[var(--surface)]",
                      )}
                    >
                      <p className="text-xs text-[var(--muted)]">
                        {message.author.firstName} {message.author.lastName} ·{" "}
                        {new Date(message.createdAt).toLocaleString("de-CH")}
                        {internal ? " · Interner Kommentar" : " · Antwort an meldende Person"}
                      </p>
                      <ClubMeldungMessageBody
                        body={message.body}
                        mentions={message.mentions ?? []}
                      />
                    </li>
                  );
                })
              )}
            </ul>
          </SceClubDevelopmentSectionShell>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <div className={cn(SCE_CD_WORKSPACE_PANEL_CLASS, "space-y-3 text-sm")}>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Zuständigkeit</h2>
            <dl className="space-y-3 text-[var(--text-2)]">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Verantwortlich</dt>
                <dd className="mt-1">
                  {props.canMutate && props.assignOptions ? (
                    <ClubMeldungAssigneePicker
                      members={props.assignOptions.members}
                      selectedUserId={props.accountableUser?.id ?? null}
                      onSelect={assignFromSidebar}
                      disabled={!props.canMutate}
                      pending={pending}
                    />
                  ) : props.accountableUser ? (
                    <div className="flex items-center gap-2">
                      <CoordinatorAvatar
                        name={personDisplayName(props.accountableUser)}
                        compact
                      />
                      <span>{personDisplayName(props.accountableUser)}</span>
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">Noch nicht zugewiesen</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Erstellt von</dt>
                <dd className="mt-1">
                  {props.createdByUser ? (
                    <div className="flex items-center gap-2">
                      <CoordinatorAvatar
                        name={personDisplayName(props.createdByUser)}
                        compact
                      />
                      <div>
                        <span>{personDisplayName(props.createdByUser)}</span>
                        <p className="text-xs text-[var(--muted)]">
                          {new Date(props.createdAt).toLocaleString("de-CH")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">
                      Nicht verfügbar ·{" "}
                      {new Date(props.createdAt).toLocaleString("de-CH")}
                    </span>
                  )}
                </dd>
              </div>
              {reporterDiffersFromCreator ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    Meldende Person
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <CoordinatorAvatar name={personDisplayName(props.reporterUser)} compact />
                    <span>{personDisplayName(props.reporterUser)}</span>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Bereich</dt>
                <dd>{props.orgUnit?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Nächster Schritt</dt>
                <dd>{props.nextStep?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Wiedervorlage</dt>
                <dd>
                  {props.followUpAt
                    ? new Date(props.followUpAt).toLocaleString("de-CH")
                    : "—"}
                </dd>
              </div>
              {props.duplicateOf ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Duplikat von</dt>
                  <dd>
                    <Link
                      href={`/tenant/${props.tenantSlug}/cockpit/meldungen/${props.duplicateOf.id}`}
                      className="text-[var(--sce-primary)] hover:underline"
                    >
                      {props.duplicateOf.caseNumber}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {props.canMutate ? (
            <div className={cn(SCE_CD_WORKSPACE_PANEL_CLASS, "space-y-2")}>
              {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
              {!props.accountableUser ? (
                <button
                  type="button"
                  className="sce-button-primary w-full rounded-md px-3 py-2 text-sm font-medium"
                  disabled={pending}
                  onClick={claimSelf}
                >
                  Übernehmen
                </button>
              ) : null}
              <button
                type="button"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => togglePanel("assign")}
              >
                Zuständigkeit ändern
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => togglePanel("status")}
              >
                Status ändern
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => togglePanel("task")}
              >
                Aufgabe erstellen
              </button>
              <button
                type="button"
                className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                onClick={() => togglePanel("more")}
              >
                Weitere Aktionen
              </button>

              {activePanel === "assign" ? (
                <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm">
                  {props.assignOptions ? (
                    <>
                      <label className="block text-xs font-medium text-[var(--text-2)]">
                        Bereich
                        <select
                          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                          value={assignOrgUnitId ?? ""}
                          onChange={(event) =>
                            setAssignOrgUnitId(event.target.value || null)
                          }
                          disabled={pending}
                        >
                          <option value="">—</option>
                          {props.assignOptions.orgUnits.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs text-[var(--muted)]">
                        Verantwortliche Person über «Verantwortlich» in der Spalte links
                        zuweisen. Hier nur Bereich anpassen.
                      </p>
                      <button
                        type="button"
                        className="sce-button-primary w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
                        disabled={pending}
                        onClick={submitOrgUnitOnly}
                      >
                        Bereich speichern
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="w-full text-sm text-[var(--sce-primary)] hover:underline disabled:opacity-60"
                    disabled={pending}
                    onClick={claimSelf}
                  >
                    Mir zuweisen
                  </button>
                </div>
              ) : null}

              {activePanel === "status" ? (
                <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm">
                  <label className="block text-xs font-medium text-[var(--text-2)]">
                    Status
                    <select
                      className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                      value={currentStatus}
                      onChange={(event) =>
                        setCurrentStatus(event.target.value as ClubMeldungStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {CLUB_MELDUNG_STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {currentStatus === "WAITING" ? (
                    <label className="block text-xs font-medium text-[var(--text-2)]">
                      Wartegrund
                      <textarea
                        className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                        rows={2}
                        value={waitReason}
                        onChange={(event) => setWaitReason(event.target.value)}
                      />
                    </label>
                  ) : null}
                  {currentStatus === "DONE" ? (
                    <label className="block text-xs font-medium text-[var(--text-2)]">
                      Erledigt — Zusammenfassung
                      <textarea
                        className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                        rows={3}
                        value={resolutionSummary}
                        onChange={(event) => setResolutionSummary(event.target.value)}
                        placeholder={
                          storedResolution
                            ? "Neue Zusammenfassung beim erneuten Abschließen"
                            : "Kurz festhalten, wie die Meldung erledigt wurde"
                        }
                      />
                    </label>
                  ) : null}
                  {props.status === "DONE" && currentStatus !== "DONE" ? (
                    <label className="block text-xs font-medium text-[var(--text-2)]">
                      Wiedereröffnen — Grund
                      <textarea
                        className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                        rows={2}
                        value={reopenReason}
                        onChange={(event) => setReopenReason(event.target.value)}
                      />
                    </label>
                  ) : null}
                  <label className="block text-xs font-medium text-[var(--text-2)]">
                    Wiedervorlage
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                      value={followUpAt}
                      onChange={(event) => setFollowUpAt(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    className="sce-button-primary w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
                    onClick={() => startTransition(() => patchStatus(currentStatus))}
                  >
                    Status speichern
                  </button>
                </div>
              ) : null}

              {activePanel === "task" ? (
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm">
                  <label className="block text-xs font-medium text-[var(--text-2)]">
                    Titel
                    <input
                      className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                      value={taskTitle}
                      onChange={(event) => setTaskTitle(event.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-medium text-[var(--text-2)]">
                    Beschreibung (optional)
                    <textarea
                      className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                      rows={3}
                      value={taskDescription}
                      onChange={(event) => setTaskDescription(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending || !taskTitle.trim()}
                    className="sce-button-primary w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
                    onClick={createLinkedTask}
                  >
                    Aufgabe anlegen
                  </button>
                </div>
              ) : null}

              {activePanel === "more" ? (
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm">
                  <button
                    type="button"
                    className="w-full text-left text-sm text-[var(--sce-primary)] hover:underline"
                    onClick={() => {
                      setActivePanel("duplicate");
                    }}
                  >
                    Als Duplikat verknüpfen
                  </button>
                </div>
              ) : null}

              {activePanel === "duplicate" ? (
                <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 text-sm">
                  <label className="block text-xs font-medium text-[var(--text-2)]">
                    Suche (Meldungsnummer oder Betreff)
                    <input
                      className="mt-1 w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                      value={duplicateQuery}
                      onChange={(event) => setDuplicateQuery(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                    disabled={pending || duplicateQuery.trim().length < 2}
                    onClick={searchDuplicates}
                  >
                    Suchen
                  </button>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {duplicateResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded border px-2 py-1.5 text-left text-xs",
                            selectedDuplicateId === result.id
                              ? "border-[var(--sce-primary)] bg-[var(--surface)]"
                              : "border-transparent hover:bg-[var(--surface)]",
                          )}
                          onClick={() => setSelectedDuplicateId(result.id)}
                        >
                          <span className="font-mono text-[var(--muted)]">{result.caseNumber}</span>
                          <span className="mt-0.5 block text-[var(--foreground)]">{result.subject}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={pending || !selectedDuplicateId}
                    className="sce-button-primary w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
                    onClick={linkDuplicate}
                  >
                    Verknüpfen
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}