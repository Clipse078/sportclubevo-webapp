"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import {
  MeetingInitiativeLinkSelect,
  type InitiativeLinkOption,
} from "@/components/admin/meetings/workspace/MeetingInitiativeLinkSelect";
import {
  MeetingWorkspacePeopleField,
  personDisplayLabel,
  personPickerFromIds,
} from "@/components/admin/meetings/workspace/MeetingWorkspacePeopleField";
import type { PersonPickerResult } from "@/components/shared/PeoplePicker";
import {
  AGENDA_DURATION_PRESETS_MIN,
  agendaExceedsMeetingPlannedTime,
  sumAgendaPlannedMinutes,
} from "@/lib/meetings/agenda-duration";
import { buildAgendaItemCollapsedMetadata } from "@/lib/meetings/agenda-item-presentation";
import { meetingWorkspaceApi } from "@/lib/meetings/meeting-workspace-mutations";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import type { MeetingActionStatus, MeetingStatus } from "@prisma/client";
import MeetingDecisionApprovalPanel from "@/components/admin/meetings/approval/MeetingDecisionApprovalPanel";
import { meetingApprovalAggregateStatusLabel } from "@/lib/meetings/meeting-approval-presentation";
import { MeetingCarryForwardPanel } from "@/components/admin/meetings/workspace/MeetingCarryForwardPanel";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSectionHeaderClass,
} from "./meetingWorkspaceFieldClasses";
import { MeetingDecisionTasksPanel } from "@/components/admin/meetings/workspace/MeetingDecisionTasksPanel";

function meetingSectionDomId(title: string): string {
  return `meeting-section-${title.toLowerCase().replace(/\s+/g, "-")}`;
}

type AgendaItem = MeetingSubEntities["agendaItems"][number];
type Participant = MeetingSubEntities["participants"][number];
type Decision = MeetingSubEntities["decisions"][number];
type MeetingAction = MeetingSubEntities["actions"][number];

type SectionProps<T> = {
  meetingId: string;
  canManage: boolean;
  items: T[];
  onItemsChange: (items: T[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
      {message}
    </p>
  );
}

function SectionShell({
  title,
  children,
  action,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  const sectionId = meetingSectionDomId(title);
  return (
    <section id={sectionId} className={workspacePanelClass} data-testid={sectionId}>
      <div className={workspaceSectionHeaderClass}>
        <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function MeetingAgendaSection({
  meetingId,
  meetingPlannedDurationMin,
  canManage,
  items,
  decisions,
  onItemsChange,
  onDecisionsChange,
  onDirtyChange,
}: SectionProps<AgendaItem> & {
  meetingPlannedDurationMin?: number | null;
  decisions: Decision[];
  onDecisionsChange: (items: Decision[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");

  async function refreshFromServer() {
    const res = await fetch(`/api/meetings/${meetingId}/agenda`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.items)) {
      onItemsChange(data.items);
    }
  }

  function addItem() {
    const title = newTitle.trim();
    if (!title) return;
    setError(null);
    startTransition(async () => {
      try {
        const nextIndex = items.length > 0 ? Math.max(...items.map((i) => i.orderIndex)) + 1 : 0;
        await meetingWorkspaceApi.agenda.create(meetingId, { title, orderIndex: nextIndex });
        await refreshFromServer();
        setNewTitle("");
        onDirtyChange?.(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  function saveItem(item: AgendaItem, draft: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.agenda.update(meetingId, item.id, draft);
        await refreshFromServer();
        onDirtyChange?.(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  function deleteItem(itemId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.agenda.remove(meetingId, itemId);
        onItemsChange(items.filter((i) => i.id !== itemId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  const agendaTotalMin = useMemo(() => sumAgendaPlannedMinutes(items), [items]);
  const exceedsPlanned = agendaExceedsMeetingPlannedTime({
    agendaTotalMin,
    meetingPlannedDurationMin,
  });

  return (
    <SectionShell title="Traktanden">
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-2)]">
        <span>
          Geplante Traktandenzeit: <strong className="text-[var(--foreground)]">{agendaTotalMin} min</strong>
        </span>
        {typeof meetingPlannedDurationMin === "number" && meetingPlannedDurationMin > 0 ? (
          <span>
            Sitzungsdauer: <strong className="text-[var(--foreground)]">{meetingPlannedDurationMin} min</strong>
          </span>
        ) : null}
      </div>
      {exceedsPlanned ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          Die geplante Traktandenzeit übersteigt die Meeting-Dauer — nur ein Hinweis, kein Blocker.
        </p>
      ) : null}
      <ErrorBanner message={error} />
      {canManage ? (
        <MeetingCarryForwardPanel
          meetingId={meetingId}
          canManage={canManage}
          onApplied={async () => {
            await refreshFromServer();
          }}
        />
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Noch keine Traktanden — erfasse den Ablauf der Sitzung.</p>
      ) : (
        items.map((item, idx) => (
          <AgendaItemRow
            key={item.id}
            index={idx + 1}
            item={item}
            canManage={canManage}
            pending={pending}
            relatedDecisions={decisions.filter((d) => d.sourceAgendaItemId === item.id)}
            meetingId={meetingId}
            onSave={(draft) => saveItem(item, draft)}
            onDelete={() => deleteItem(item.id)}
            onDirty={() => onDirtyChange?.(true)}
            onDecisionCreated={async () => {
              const res = await fetch(`/api/meetings/${meetingId}/decisions`);
              const data = await res.json();
              if (res.ok && Array.isArray(data.decisions)) onDecisionsChange(data.decisions);
            }}
          />
        ))
      )}
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Neues Traktandum</label>
            <input
              className={workspaceInputClass}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titel"
            />
          </div>
          <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !newTitle.trim()} onClick={addItem}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1.5">Hinzufügen</span>
          </button>
        </div>
      ) : null}
    </SectionShell>
  );
}

function AgendaItemRow({
  index,
  item,
  canManage,
  pending,
  relatedDecisions,
  meetingId,
  onSave,
  onDelete,
  onDirty,
  onDecisionCreated,
}: {
  index: number;
  item: AgendaItem;
  canManage: boolean;
  pending: boolean;
  relatedDecisions: Decision[];
  meetingId: string;
  onSave: (draft: Record<string, unknown>) => void;
  onDelete: () => void;
  onDirty: () => void;
  onDecisionCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [status, setStatus] = useState(item.status);
  const [durationMin, setDurationMin] = useState(
    item.durationMin != null ? String(item.durationMin) : "",
  );
  const [customDuration, setCustomDuration] = useState("");
  const [ownerPerson, setOwnerPerson] = useState<PersonPickerResult | null>(
    personPickerFromIds(item.ownerPersonId, item.owner),
  );
  const initiativeFromItem = item.initiative;
  const [initiative, setInitiative] = useState<InitiativeLinkOption | null>(
    initiativeFromItem
      ? {
          id: initiativeFromItem.id,
          slug: initiativeFromItem.slug,
          title: initiativeFromItem.title,
          status: initiativeFromItem.status,
        }
      : null,
  );

  const collapsedMetadata = buildAgendaItemCollapsedMetadata(item);
  const [creatingDecision, setCreatingDecision] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);

  async function createDecisionFromAgenda() {
    const trimmed = decisionTitle.trim();
    if (!trimmed) return;
    setDecisionError(null);
    try {
      await meetingWorkspaceApi.decisions.create(meetingId, {
        title: trimmed,
        sourceAgendaItemId: item.id,
        status: "CONFIRMED",
      });
      setDecisionTitle("");
      setCreatingDecision(false);
      await onDecisionCreated();
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : "Beschluss konnte nicht gespeichert werden.");
    }
  }

  return (
    <SceExpandablePanel
      defaultOpen={false}
      testId={`meeting-agenda-item-${item.id}`}
      summary={
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b4aa2]/10 text-xs font-semibold text-[#0b4aa2]">
              {index}
            </span>
            <span className="min-w-0 flex-1 font-medium text-[var(--foreground)] break-words">
              {item.title}
            </span>
            {initiativeFromItem ? (
              <span className="shrink-0 text-xs text-[var(--text-2)]">↗ {initiativeFromItem.title}</span>
            ) : null}
          </div>
          {collapsedMetadata.length > 0 ? (
            <p
              className="min-w-0 break-words pl-9 text-xs font-normal text-[var(--text-2)]"
              data-testid={`meeting-agenda-item-${item.id}-summary-meta`}
            >
              {collapsedMetadata.join(" · ")}
            </p>
          ) : null}
        </div>
      }
    >
      {canManage ? (
        <div className="space-y-3">
          <input className={workspaceInputClass} value={title} onChange={(e) => { setTitle(e.target.value); onDirty(); }} />
          <textarea
            className={`${workspaceInputClass} min-h-[80px]`}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); onDirty(); }}
            placeholder="Notizen"
          />
          <MeetingWorkspacePeopleField
            label="Traktanden-Verantwortliche/r"
            selected={ownerPerson}
            onSelect={(person) => { setOwnerPerson(person); onDirty(); }}
            onClear={() => { setOwnerPerson(null); onDirty(); }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Geplante Dauer</label>
              <select
                className={workspaceInputClass}
                value={durationMin}
                onChange={(e) => { setDurationMin(e.target.value); onDirty(); }}
              >
                <option value="">Keine Angabe</option>
                {AGENDA_DURATION_PRESETS_MIN.map((preset) => (
                  <option key={preset} value={String(preset)}>
                    {preset} min
                  </option>
                ))}
                <option value="custom">Eigene Dauer…</option>
              </select>
            </div>
            {durationMin === "custom" ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Minuten</label>
                <input
                  type="number"
                  min={1}
                  className={workspaceInputClass}
                  value={customDuration}
                  onChange={(e) => { setCustomDuration(e.target.value); onDirty(); }}
                />
              </div>
            ) : null}
          </div>
          <MeetingInitiativeLinkSelect value={initiative} onChange={(next) => { setInitiative(next); onDirty(); }} />
          <select
            className={workspaceInputClass}
            value={status}
            onChange={(e) => { setStatus(e.target.value as AgendaItem["status"]); onDirty(); }}
          >
            <option value="OPEN">Offen</option>
            <option value="DISCUSSED">Besprochen</option>
            <option value="SKIPPED">Übersprungen</option>
          </select>
          {relatedDecisions.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Beschlüsse</p>
              <ul className="space-y-1 text-sm">
                {relatedDecisions.map((d) => (
                  <li key={d.id} className="font-medium text-[var(--foreground)]">
                    {d.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {decisionError ? (
            <p className="text-xs text-rose-700" role="alert">
              {decisionError}
            </p>
          ) : null}
          {creatingDecision ? (
            <div className="flex flex-wrap items-end gap-2">
              <input
                className={workspaceInputClass}
                value={decisionTitle}
                onChange={(e) => setDecisionTitle(e.target.value)}
                placeholder="Beschlusstitel"
              />
              <button
                type="button"
                className={workspacePrimaryButtonClass}
                disabled={pending || !decisionTitle.trim()}
                onClick={() => void createDecisionFromAgenda()}
              >
                Beschluss erfassen
              </button>
              <button type="button" className={workspaceGhostButtonClass} onClick={() => setCreatingDecision(false)}>
                Abbrechen
              </button>
            </div>
          ) : (
            <button type="button" className={workspaceGhostButtonClass} onClick={() => setCreatingDecision(true)}>
              Beschluss aus Traktandum
            </button>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !title.trim()}
              onClick={() => {
                const resolvedDuration =
                  durationMin === "custom"
                    ? customDuration
                    : durationMin === ""
                      ? null
                      : durationMin;
                onSave({
                  title: title.trim(),
                  notes,
                  status,
                  durationMin: resolvedDuration,
                  ownerPersonId: ownerPerson?.id ?? null,
                  owner: ownerPerson ? personDisplayLabel(ownerPerson) : null,
                  initiativeId: initiative?.id ?? null,
                });
              }}
            >
              Speichern
            </button>
            <button type="button" className={workspaceGhostButtonClass} disabled={pending} onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-[var(--text-2)]">
          {item.notes ? <p>{item.notes}</p> : null}
          {item.owner ? <p>Verantwortlich: {item.owner}</p> : null}
          {item.durationMin ? <p>Dauer: {item.durationMin} min</p> : null}
          {initiativeFromItem ? (
            <p>
              Vorhaben:{" "}
              <Link href={`/vereinsleitung/initiativen/${initiativeFromItem.slug}`} className="font-semibold text-[#0b4aa2]">
                {initiativeFromItem.title}
              </Link>{" "}
              ({initiativeFromItem.status})
            </p>
          ) : null}
          {relatedDecisions.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold text-[var(--muted)]">Beschlüsse</p>
              {relatedDecisions.map((d) => (
                <p key={d.id}>{d.title}</p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </SceExpandablePanel>
  );
}

export function MeetingParticipantsSection({
  meetingId,
  canManage,
  items,
  onItemsChange,
  onDirtyChange,
}: SectionProps<Participant>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedPerson, setSelectedPerson] = useState<PersonPickerResult | null>(null);
  const [role, setRole] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  function addParticipant() {
    if (!selectedPerson) return;
    setError(null);
    startTransition(async () => {
      try {
        const { participant } = await meetingWorkspaceApi.participants.create(meetingId, {
          personId: selectedPerson.id,
          name: personDisplayLabel(selectedPerson),
          role: role.trim() || null,
          status: "INVITED",
        });
        const res = await fetch(`/api/meetings/${meetingId}/participants`);
        const data = await res.json();
        if (res.ok) onItemsChange(data.participants);
        else
          onItemsChange([
            ...items,
            {
              id: participant.id,
              name: personDisplayLabel(selectedPerson),
              role: role.trim() || null,
              status: "INVITED",
              userId: null,
              personId: selectedPerson.id,
            },
          ]);
        setSelectedPerson(null);
        setRole("");
        onDirtyChange?.(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  function updateStatus(participant: Participant, status: Participant["status"]) {
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.participants.update(meetingId, participant.id, { status });
        onItemsChange(items.map((p) => (p.id === participant.id ? { ...p, status } : p)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <SectionShell
      title="Teilnehmer"
      action={
        canManage ? (
          <button
            type="button"
            className={workspaceGhostButtonClass}
            onClick={() => setShowAddForm((v) => !v)}
            data-testid="meeting-participants-add-toggle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1">Teilnehmer hinzufügen</span>
          </button>
        ) : null
      }
    >
      <ErrorBanner message={error} />
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Noch keine Teilnehmer erfasst.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{p.name}</p>
                {p.role ? <p className="text-xs text-[var(--text-2)]">{p.role}</p> : null}
              </div>
              {canManage ? (
                <select
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs"
                  value={p.status}
                  disabled={pending}
                  onChange={(e) => updateStatus(p, e.target.value as Participant["status"])}
                >
                  <option value="INVITED">Eingeladen</option>
                  <option value="PRESENT">Anwesend</option>
                  <option value="ABSENT">Abwesend</option>
                  <option value="EXCUSED">Entschuldigt</option>
                </select>
              ) : (
                <span className="text-xs font-semibold text-[var(--text-2)]">{p.status}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && showAddForm ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <div className="min-w-[220px] flex-1">
            <MeetingWorkspacePeopleField
              label="Teilnehmer/in"
              selected={selectedPerson}
              onSelect={setSelectedPerson}
              onClear={() => setSelectedPerson(null)}
            />
          </div>
          <input className={workspaceInputClass} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rolle (optional)" />
          <button
            type="button"
            className={workspaceGhostButtonClass}
            onClick={() => {
              setShowAddForm(false);
              setSelectedPerson(null);
              setRole("");
            }}
          >
            Abbrechen
          </button>
          <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !selectedPerson} onClick={addParticipant}>
            Speichern
          </button>
        </div>
      ) : null}
    </SectionShell>
  );
}

export function MeetingDecisionsSection({
  meetingId,
  meetingSlug,
  meetingStatus,
  canManage,
  documentationEditable,
  actorPersonId,
  approvalWorkspaceData,
  agendaItems,
  items,
  onItemsChange,
}: SectionProps<Decision> & {
  meetingSlug: string;
  meetingStatus: MeetingStatus;
  documentationEditable: boolean;
  actorPersonId: string | null;
  approvalWorkspaceData: MeetingApprovalWorkspaceData;
  agendaItems: AgendaItem[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rationale, setRationale] = useState("");
  const [ownerPerson, setOwnerPerson] = useState<PersonPickerResult | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  function addDecision() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.decisions.create(meetingId, {
          title: trimmed,
          description: description.trim() || null,
          rationale: rationale.trim() || null,
          status: "CONFIRMED",
          ownerPersonId: ownerPerson?.id ?? null,
          owner: ownerPerson ? personDisplayLabel(ownerPerson) : null,
        });
        const res = await fetch(`/api/meetings/${meetingId}/decisions`);
        const data = await res.json();
        if (res.ok) onItemsChange(data.decisions);
        setTitle("");
        setDescription("");
        setRationale("");
        setOwnerPerson(null);
        setShowCreateForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <SectionShell
      title="Beschlüsse"
      action={
        documentationEditable ? (
          <button
            type="button"
            className={workspaceGhostButtonClass}
            onClick={() => setShowCreateForm((v) => !v)}
            data-testid="meeting-decision-create-toggle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1">Beschluss erfassen</span>
          </button>
        ) : null
      }
    >
      <ErrorBanner message={error} />
      {items.map((d) => (
        <MeetingDecisionCard
          key={d.id}
          meetingId={meetingId}
          meetingSlug={meetingSlug}
          meetingStatus={meetingStatus}
          decision={d}
          canManage={canManage}
          documentationEditable={documentationEditable}
          actorPersonId={actorPersonId}
          approvalWorkspaceData={approvalWorkspaceData}
          agendaItems={agendaItems}
          onDecisionUpdated={(updated) => {
            onItemsChange(items.map((row) => (row.id === d.id ? { ...row, ...updated } : row)));
          }}
          onSourceAgendaChange={(sourceAgendaItemId) => {
            onItemsChange(
              items.map((row) => (row.id === d.id ? { ...row, sourceAgendaItemId } : row)),
            );
          }}
        />
      ))}
      {documentationEditable && showCreateForm ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <input className={workspaceInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beschlusstitel" />
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Beschlusswortlaut (optional)</span>
            <textarea
              className={workspaceInputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was genau wurde beschlossen?"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Begründung (optional)</span>
            <textarea
              className={workspaceInputClass}
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Warum wurde so entschieden?"
            />
          </label>
          <MeetingWorkspacePeopleField
            label="Verantwortliche/r (optional)"
            selected={ownerPerson}
            onSelect={setOwnerPerson}
            onClear={() => setOwnerPerson(null)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspaceGhostButtonClass}
              onClick={() => {
                setShowCreateForm(false);
                setTitle("");
                setDescription("");
                setRationale("");
                setOwnerPerson(null);
              }}
            >
              Abbrechen
            </button>
            <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !title.trim()} onClick={addDecision}>
              Speichern
            </button>
          </div>
        </div>
      ) : null}
    </SectionShell>
  );
}

function MeetingDecisionCard({
  meetingId,
  meetingSlug,
  meetingStatus,
  decision,
  canManage,
  documentationEditable,
  actorPersonId,
  approvalWorkspaceData,
  agendaItems,
  onDecisionUpdated,
  onSourceAgendaChange,
}: {
  meetingId: string;
  meetingSlug: string;
  meetingStatus: MeetingStatus;
  decision: Decision;
  canManage: boolean;
  documentationEditable: boolean;
  actorPersonId: string | null;
  approvalWorkspaceData: MeetingApprovalWorkspaceData;
  agendaItems: AgendaItem[];
  onDecisionUpdated: (updated: Partial<Decision>) => void;
  onSourceAgendaChange: (sourceAgendaItemId: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [sourceAgendaItemId, setSourceAgendaItemId] = useState(decision.sourceAgendaItemId ?? "");
  const [editingDetails, setEditingDetails] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(decision.description ?? "");
  const [rationaleDraft, setRationaleDraft] = useState(decision.rationale ?? "");
  const linkedAgenda = agendaItems.find((a) => a.id === decision.sourceAgendaItemId);

  function saveAgendaLink(nextId: string) {
    setSourceAgendaItemId(nextId);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.decisions.update(meetingId, decision.id, {
          sourceAgendaItemId: nextId || null,
        });
        onSourceAgendaChange(nextId || null);
      } catch {
        // silent — workspace error surface via parent if needed
      }
    });
  }

  const descriptionPreview = decision.description?.trim()
    ? decision.description.trim().split(/\n/)[0]?.slice(0, 120)
    : null;

  const summaryMeta = [
    linkedAgenda?.title ? `Traktandum: ${linkedAgenda.title}` : null,
    decision.owner ? decision.owner : null,
    decision.approvalRequired
      ? meetingApprovalAggregateStatusLabel(decision.approvalStatus)
      : "Freigabe nicht erforderlich",
  ].filter(Boolean);

  function saveDescription() {
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.decisions.update(meetingId, decision.id, {
          description: descriptionDraft.trim() || null,
          rationale: rationaleDraft.trim() || null,
        });
        onDecisionUpdated({
          description: descriptionDraft.trim() || null,
          rationale: rationaleDraft.trim() || null,
        });
        setEditingDetails(false);
      } catch {
        // no-op
      }
    });
  }

  return (
    <SceExpandablePanel
      defaultOpen={false}
      testId={`meeting-decision-${decision.id}`}
      summary={
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-[var(--foreground)]">{decision.title}</p>
          {descriptionPreview ? (
            <p className="text-xs text-[var(--text-2)] line-clamp-1">{descriptionPreview}</p>
          ) : null}
          {summaryMeta.length ? (
            <p className="text-xs text-[var(--muted)]">{summaryMeta.join(" · ")}</p>
          ) : null}
        </div>
      }
    >
      {documentationEditable && editingDetails ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Beschlusswortlaut</span>
            <textarea
              className={workspaceInputClass}
              rows={4}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              placeholder="Was genau wurde beschlossen?"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Begründung</span>
            <textarea
              className={workspaceInputClass}
              rows={4}
              value={rationaleDraft}
              onChange={(e) => setRationaleDraft(e.target.value)}
              placeholder="Warum wurde so entschieden?"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          {decision.description ? (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[var(--muted)]">Beschlusswortlaut</p>
              <p className="text-sm text-[var(--text-2)] whitespace-pre-wrap">{decision.description}</p>
            </div>
          ) : documentationEditable ? (
            <p className="text-sm italic text-[var(--muted)]">Noch kein Beschlusswortlaut erfasst.</p>
          ) : null}
          {decision.rationale ? (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[var(--muted)]">Begründung</p>
              <p className="text-sm text-[var(--text-2)] whitespace-pre-wrap">{decision.rationale}</p>
            </div>
          ) : documentationEditable && !editingDetails ? (
            <p className="text-sm italic text-[var(--muted)]">Noch keine Begründung erfasst.</p>
          ) : null}
        </div>
      )}
      <p
        className="text-[11px] font-medium text-[var(--muted)]"
        data-testid={`decision-approval-status-${decision.id}`}
      >
        {decision.approvalRequired
          ? `Freigabe: ${meetingApprovalAggregateStatusLabel(decision.approvalStatus)}`
          : "Freigabe: Nicht erforderlich"}
      </p>
      {editingDetails || documentationEditable ? (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Zugehöriges Traktandum</label>
          {documentationEditable ? (
            <select
              className={workspaceInputClass}
              value={sourceAgendaItemId}
              disabled={pending}
              onChange={(e) => saveAgendaLink(e.target.value)}
            >
              <option value="">Kein Traktandum</option>
              {agendaItems.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          ) : linkedAgenda ? (
            <p className="text-sm text-[var(--text-2)]">{linkedAgenda.title}</p>
          ) : (
            <p className="text-sm italic text-[var(--muted)]">Kein Traktandum verknüpft</p>
          )}
        </div>
      ) : linkedAgenda ? (
        <p className="text-sm text-[var(--text-2)]">{linkedAgenda.title}</p>
      ) : null}
      {documentationEditable ? (
        <div className="flex flex-wrap gap-2">
          {editingDetails ? (
            <>
              <button type="button" className={workspacePrimaryButtonClass} disabled={pending} onClick={saveDescription}>
                Speichern
              </button>
              <button
                type="button"
                className={workspaceGhostButtonClass}
                onClick={() => {
                  setDescriptionDraft(decision.description ?? "");
                  setRationaleDraft(decision.rationale ?? "");
                  setEditingDetails(false);
                }}
              >
                Abbrechen
              </button>
            </>
          ) : (
            <button
              type="button"
              className={workspaceGhostButtonClass}
              onClick={() => setEditingDetails(true)}
              data-testid={`meeting-decision-edit-details-${decision.id}`}
            >
              Dokumentation bearbeiten
            </button>
          )}
        </div>
      ) : null}
      <MeetingDecisionApprovalPanel
        meetingId={meetingId}
        meetingStatus={meetingStatus}
        decision={decision}
        canManage={canManage}
        actorPersonId={actorPersonId}
        approvalData={approvalWorkspaceData}
        onDecisionUpdated={onDecisionUpdated}
      />
      <MeetingDecisionTasksPanel
        meetingId={meetingId}
        meetingSlug={meetingSlug}
        decisionId={decision.id}
        decisionTitle={decision.title}
        canManage={documentationEditable}
      />
    </SceExpandablePanel>
  );
}

const MEETING_ACTION_STATUS_LABELS: Record<MeetingActionStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

function MeetingActionRow({
  action,
  meetingId,
  canManage,
  onUpdated,
  onRemoved,
}: {
  action: MeetingAction;
  meetingId: string;
  canManage: boolean;
  onUpdated: (patch: Partial<MeetingAction>) => void;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editingDocs, setEditingDocs] = useState(false);
  const [title, setTitle] = useState(action.title);
  const [status, setStatus] = useState(action.status);
  const [descriptionDraft, setDescriptionDraft] = useState(action.description ?? "");
  const [expectedOutcomeDraft, setExpectedOutcomeDraft] = useState(action.expectedOutcome ?? "");
  const [dueDate, setDueDate] = useState(
    action.dueDate ? new Date(action.dueDate).toISOString().slice(0, 10) : "",
  );
  const [ownerPerson, setOwnerPerson] = useState<PersonPickerResult | null>(
    personPickerFromIds(action.ownerPersonId, action.owner),
  );

  function save() {
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.update(meetingId, action.id, {
          title: title.trim(),
          status,
          dueDate: dueDate || null,
          ownerPersonId: ownerPerson?.id ?? null,
          owner: ownerPerson ? personDisplayLabel(ownerPerson) : null,
        });
        onUpdated({
          title: title.trim(),
          status,
          dueDate: dueDate ? new Date(dueDate) : null,
          owner: ownerPerson ? personDisplayLabel(ownerPerson) : null,
          ownerPersonId: ownerPerson?.id ?? null,
        });
        setEditing(false);
      } catch {
        // no-op
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.remove(meetingId, action.id);
        onRemoved();
      } catch {
        // no-op
      }
    });
  }

  const descriptionPreview = action.description?.trim()
    ? action.description.trim().split(/\n/)[0]?.slice(0, 120)
    : null;

  const meta = [
    action.owner,
    action.dueDate
      ? `Fällig ${new Intl.DateTimeFormat("de-CH").format(new Date(action.dueDate))}`
      : null,
    MEETING_ACTION_STATUS_LABELS[action.status],
  ].filter(Boolean);

  function saveDocumentation() {
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.update(meetingId, action.id, {
          description: descriptionDraft.trim() || null,
          expectedOutcome: expectedOutcomeDraft.trim() || null,
        });
        onUpdated({
          description: descriptionDraft.trim() || null,
          expectedOutcome: expectedOutcomeDraft.trim() || null,
        });
        setEditingDocs(false);
      } catch {
        // no-op
      }
    });
  }

  return (
    <SceExpandablePanel
      defaultOpen={false}
      testId={`meeting-action-${action.id}`}
      summary={
        <div className="min-w-0 space-y-0.5">
          <p className="font-semibold text-[var(--foreground)]">{action.title}</p>
          {descriptionPreview ? (
            <p className="text-xs text-[var(--text-2)] line-clamp-1">{descriptionPreview}</p>
          ) : null}
          {meta.length ? <p className="text-xs text-[var(--muted)]">{meta.join(" · ")}</p> : null}
        </div>
      }
    >
      {canManage && editing ? (
        <div className="space-y-3">
          <input className={workspaceInputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          <MeetingWorkspacePeopleField
            label="Verantwortliche/r"
            selected={ownerPerson}
            onSelect={setOwnerPerson}
            onClear={() => setOwnerPerson(null)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
              Status
              <select
                className={workspaceInputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as MeetingActionStatus)}
              >
                {(Object.keys(MEETING_ACTION_STATUS_LABELS) as MeetingActionStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {MEETING_ACTION_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-[var(--muted)]">
              Fälligkeitsdatum
              <input
                type="date"
                className={workspaceInputClass}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !title.trim()} onClick={save}>
              Speichern
            </button>
            <button type="button" className={workspaceGhostButtonClass} onClick={() => setEditing(false)}>
              Abbrechen
            </button>
            <button type="button" className={workspaceGhostButtonClass} disabled={pending} onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-[var(--text-2)]">
          <p>Status: {MEETING_ACTION_STATUS_LABELS[action.status]}</p>
          {action.owner ? <p>Verantwortlich: {action.owner}</p> : null}
          {canManage && editingDocs ? (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--muted)]">Beschreibung</span>
                <textarea
                  className={workspaceInputClass}
                  rows={3}
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder="Was ist die Massnahme?"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-[var(--muted)]">Erwartetes Ergebnis</span>
                <textarea
                  className={workspaceInputClass}
                  rows={3}
                  value={expectedOutcomeDraft}
                  onChange={(e) => setExpectedOutcomeDraft(e.target.value)}
                  placeholder="Woran erkennen wir den Erfolg?"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={workspacePrimaryButtonClass} disabled={pending} onClick={saveDocumentation}>
                  Speichern
                </button>
                <button
                  type="button"
                  className={workspaceGhostButtonClass}
                  onClick={() => {
                    setDescriptionDraft(action.description ?? "");
                    setExpectedOutcomeDraft(action.expectedOutcome ?? "");
                    setEditingDocs(false);
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {action.description ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[var(--muted)]">Beschreibung</p>
                  <p className="whitespace-pre-wrap">{action.description}</p>
                </div>
              ) : canManage ? (
                <p className="italic text-[var(--muted)]">Noch keine Beschreibung erfasst.</p>
              ) : null}
              {action.expectedOutcome ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[var(--muted)]">Erwartetes Ergebnis</p>
                  <p className="whitespace-pre-wrap">{action.expectedOutcome}</p>
                </div>
              ) : canManage ? (
                <p className="italic text-[var(--muted)]">Noch kein erwartetes Ergebnis erfasst.</p>
              ) : null}
            </div>
          )}
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {editingDocs ? null : (
                <>
                  <button
                    type="button"
                    className={workspaceGhostButtonClass}
                    onClick={() => setEditingDocs(true)}
                    data-testid={`meeting-action-edit-docs-${action.id}`}
                  >
                    Dokumentation bearbeiten
                  </button>
                  <button type="button" className={workspaceGhostButtonClass} onClick={() => setEditing(true)}>
                    Stammdaten bearbeiten
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </SceExpandablePanel>
  );
}

export function MeetingActionsSection({
  meetingId,
  canManage,
  items,
  onItemsChange,
}: SectionProps<MeetingAction>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [ownerPerson, setOwnerPerson] = useState<PersonPickerResult | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  function addAction() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.create(meetingId, {
          title: trimmed,
          description: description.trim() || null,
          expectedOutcome: expectedOutcome.trim() || null,
          ownerPersonId: ownerPerson?.id ?? null,
          owner: ownerPerson ? personDisplayLabel(ownerPerson) : null,
        });
        const res = await fetch(`/api/meetings/${meetingId}/actions`);
        const data = await res.json();
        if (res.ok) onItemsChange(data.actions);
        setTitle("");
        setDescription("");
        setExpectedOutcome("");
        setOwnerPerson(null);
        setShowCreateForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <SectionShell
      title="Massnahmen"
      action={
        canManage ? (
          <button
            type="button"
            className={workspaceGhostButtonClass}
            onClick={() => setShowCreateForm((v) => !v)}
            data-testid="meeting-action-create-toggle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1">Massnahme erfassen</span>
          </button>
        ) : null
      }
    >
      <ErrorBanner message={error} />
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Noch keine Massnahmen erfasst.</p>
      ) : (
        items.map((a) => (
          <MeetingActionRow
            key={a.id}
            action={a}
            meetingId={meetingId}
            canManage={canManage}
            onUpdated={(updated) => {
              onItemsChange(items.map((row) => (row.id === a.id ? { ...row, ...updated } : row)));
            }}
            onRemoved={() => onItemsChange(items.filter((row) => row.id !== a.id))}
          />
        ))
      )}
      {canManage && showCreateForm ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <input className={workspaceInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Massnahme" />
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Beschreibung (optional)</span>
            <textarea
              className={workspaceInputClass}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was ist die Massnahme?"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--muted)]">Erwartetes Ergebnis (optional)</span>
            <textarea
              className={workspaceInputClass}
              rows={2}
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              placeholder="Woran erkennen wir den Erfolg?"
            />
          </label>
          <MeetingWorkspacePeopleField
            label="Verantwortliche/r (optional)"
            selected={ownerPerson}
            onSelect={setOwnerPerson}
            onClear={() => setOwnerPerson(null)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspaceGhostButtonClass}
              onClick={() => {
                setShowCreateForm(false);
                setTitle("");
                setDescription("");
                setExpectedOutcome("");
                setOwnerPerson(null);
              }}
            >
              Abbrechen
            </button>
            <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !title.trim()} onClick={addAction}>
              Speichern
            </button>
          </div>
        </div>
      ) : null}
    </SectionShell>
  );
}

export function MeetingTasksSection({ relatedTasksPanel }: { relatedTasksPanel: ReactNode }) {
  return (
    <section id="meeting-section-aufgaben" className={workspacePanelClass} data-testid="meeting-section-aufgaben">
      <h3 className="border-b border-[var(--border)] pb-3 text-base font-semibold text-[var(--foreground)]">
        Aufgaben
      </h3>
      <div className="min-w-0">{relatedTasksPanel}</div>
    </section>
  );
}
