"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import { meetingWorkspaceApi } from "@/lib/meetings/meeting-workspace-mutations";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
} from "./meetingWorkspaceFieldClasses";

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
  icon,
  count,
  children,
  action,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={workspacePanelClass} data-testid={`meeting-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[1.08rem] font-semibold text-[var(--foreground)]">{title}</h3>
          {count !== undefined ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

export function MeetingAgendaSection({
  meetingId,
  canManage,
  items,
  onItemsChange,
  onDirtyChange,
}: SectionProps<AgendaItem>) {
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

  function saveItem(item: AgendaItem, draft: Partial<AgendaItem>) {
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

  return (
    <SectionShell title="Traktanden" icon={<ChevronDown className="h-4 w-4 text-[#0b4aa2]" />} count={items.length}>
      <ErrorBanner message={error} />
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
            onSave={(draft) => saveItem(item, draft)}
            onDelete={() => deleteItem(item.id)}
            onDirty={() => onDirtyChange?.(true)}
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
  onSave,
  onDelete,
  onDirty,
}: {
  index: number;
  item: AgendaItem;
  canManage: boolean;
  pending: boolean;
  onSave: (draft: Partial<AgendaItem>) => void;
  onDelete: () => void;
  onDirty: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [owner, setOwner] = useState(item.owner ?? "");
  const [status, setStatus] = useState(item.status);

  return (
    <SceExpandablePanel
      defaultOpen={false}
      summary={
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b4aa2]/10 text-xs font-semibold text-[#0b4aa2]">
            {index}
          </span>
          <span className="font-medium">{item.title}</span>
        </span>
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
          <input className={workspaceInputClass} value={owner} onChange={(e) => { setOwner(e.target.value); onDirty(); }} placeholder="Verantwortlich" />
          <select
            className={workspaceInputClass}
            value={status}
            onChange={(e) => { setStatus(e.target.value as AgendaItem["status"]); onDirty(); }}
          >
            <option value="OPEN">Offen</option>
            <option value="DISCUSSED">Besprochen</option>
            <option value="SKIPPED">Übersprungen</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !title.trim()}
              onClick={() => onSave({ title: title.trim(), notes, owner, status })}
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
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  function addParticipant() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        const { participant } = await meetingWorkspaceApi.participants.create(meetingId, {
          name: trimmed,
          role: role.trim() || null,
          status: "INVITED",
        });
        const res = await fetch(`/api/meetings/${meetingId}/participants`);
        const data = await res.json();
        if (res.ok) onItemsChange(data.participants);
        else
          onItemsChange([
            ...items,
            { id: participant.id, name: trimmed, role: role.trim() || null, status: "INVITED", userId: null },
          ]);
        setName("");
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

  const present = items.filter((p) => p.status === "PRESENT").length;

  return (
    <SectionShell
      title="Teilnehmer"
      icon={<ChevronDown className="h-4 w-4 text-[#0b4aa2]" />}
      count={items.length > 0 ? present : undefined}
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
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-4">
          <input className={workspaceInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input className={workspaceInputClass} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rolle (optional)" />
          <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !name.trim()} onClick={addParticipant}>
            Hinzufügen
          </button>
        </div>
      ) : null}
    </SectionShell>
  );
}

export function MeetingDecisionsSection({
  meetingId,
  canManage,
  items,
  onItemsChange,
}: SectionProps<Decision>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  function addDecision() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.decisions.create(meetingId, { title: trimmed, status: "CONFIRMED" });
        const res = await fetch(`/api/meetings/${meetingId}/decisions`);
        const data = await res.json();
        if (res.ok) onItemsChange(data.decisions);
        setTitle("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <SectionShell title="Beschlüsse" icon={<ChevronDown className="h-4 w-4 text-[#0b4aa2]" />} count={items.length}>
      <ErrorBanner message={error} />
      {items.map((d) => (
        <div key={d.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="font-semibold text-[var(--foreground)]">{d.title}</p>
          {d.description ? <p className="mt-1 text-sm text-[var(--text-2)]">{d.description}</p> : null}
        </div>
      ))}
      {canManage ? (
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
          <input className={`${workspaceInputClass} flex-1`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beschlusstitel" />
          <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !title.trim()} onClick={addDecision}>
            Erfassen
          </button>
        </div>
      ) : null}
    </SectionShell>
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
  const [owner, setOwner] = useState("");

  function addAction() {
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.create(meetingId, { title: trimmed, owner: owner.trim() || null });
        const res = await fetch(`/api/meetings/${meetingId}/actions`);
        const data = await res.json();
        if (res.ok) onItemsChange(data.actions);
        setTitle("");
        setOwner("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <SectionShell title="Massnahmen" icon={<ChevronDown className="h-4 w-4 text-[#0b4aa2]" />} count={items.length}>
      <ErrorBanner message={error} />
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="font-semibold text-[var(--foreground)]">{a.title}</p>
          {a.owner ? <p className="text-xs text-[var(--text-2)]">{a.owner}</p> : null}
        </div>
      ))}
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-4">
          <input className={workspaceInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Massnahme" />
          <input className={workspaceInputClass} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Verantwortlich" />
          <button type="button" className={workspacePrimaryButtonClass} disabled={pending || !title.trim()} onClick={addAction}>
            Erfassen
          </button>
        </div>
      ) : null}
    </SectionShell>
  );
}
