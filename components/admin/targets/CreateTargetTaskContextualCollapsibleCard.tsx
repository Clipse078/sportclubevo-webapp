"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { Button } from "@/components/ui/Button";

type Props = {
  targetId: string;
  canCreate: boolean;
};

export default function CreateTargetTaskContextualCollapsibleCard({ targetId, canCreate }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Titel ist erforderlich.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/club-development/targets/${encodeURIComponent(targetId)}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const json = (await res.json()) as { task?: { id: string }; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Aufgabe konnte nicht erstellt werden.");
        return;
      }
      setTitle("");
      setExpanded(false);
      if (json.task?.id) {
        router.push(`/dashboard/aufgaben/${encodeURIComponent(json.task.id)}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Aufgabe konnte nicht erstellt werden.");
    } finally {
      setPending(false);
    }
  }, [router, targetId, title]);

  if (!canCreate) return null;

  return (
    <SceClubDevelopmentContextualCreateCollapsibleShell
      actionLabel="Aufgabe erstellen"
      contextLabel="Direkt mit diesem Ziel verknüpft"
      expanded={expanded}
      onExpandedChange={setExpanded}
      panelDomId={`target-task-create-${targetId}`}
      cardTestId="create-target-task-contextual-card"
      collapseToggleTestId="create-target-task-contextual-toggle"
    >
      <div className="space-y-3 p-3">
        <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="target-task-title">
          Titel
        </label>
        <input
          id="target-task-title"
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={pending}
        />
        {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
        <Button type="button" onClick={() => void handleCreate()} disabled={pending}>
          {pending ? "Erstelle…" : "Aufgabe erstellen"}
        </Button>
      </div>
    </SceClubDevelopmentContextualCreateCollapsibleShell>
  );
}