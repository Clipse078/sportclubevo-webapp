"use client";

import { useTransition } from "react";
import {
  archiveTeamMessageAction,
  createTeamMessageDraftAction,
  publishTeamMessageAction,
} from "@/app/(admin)/dashboard/teams/[teamId]/kommunikation/actions";
import type { TeamCommunicationListItem } from "@/lib/communication/team/team-communication-service";
import { Button } from "@/components/ui";

type Props = {
  teamId: string;
  items: TeamCommunicationListItem[];
  canSend: boolean;
};

function formatSender(item: TeamCommunicationListItem): string {
  if (!item.senderPerson) return "Unbekannt";
  return `${item.senderPerson.firstName} ${item.senderPerson.lastName}`.trim();
}

function formatTimestamp(iso: string | null, fallback: string): string {
  const value = iso ?? fallback;
  return new Date(value).toLocaleString("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TeamCommunicationFoundationView({
  teamId,
  items,
  canSend,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6" data-testid="team-communication-foundation">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Kommunikation</h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Team-Kommunikation über die zentrale Communication-Plattform. Vollständiger Team-Chat
          folgt in COMM-05.
        </p>
      </div>

      {canSend ? (
        <form
          className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          data-testid="team-communication-create-seam"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            startTransition(async () => {
              const created = await createTeamMessageDraftAction(teamId, formData);
              if (created.ok && created.communicationId) {
                await publishTeamMessageAction(teamId, created.communicationId);
                form.reset();
              }
            });
          }}
        >
          <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="bodyText">
            Nachricht (Foundation)
          </label>
          <textarea
            id="bodyText"
            name="bodyText"
            required
            maxLength={8000}
            rows={4}
            className="w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm"
            placeholder="Kurze Team-Nachricht…"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Senden…" : "Nachricht veröffentlichen"}
          </Button>
        </form>
      ) : null}

      <section aria-label="Team-Kommunikation Liste">
        {items.length === 0 ? (
          <p
            className="rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-2)]"
            data-testid="team-communication-empty-state"
          >
            Noch keine Team-Kommunikation.{" "}
            {canSend ? "Erstellen Sie die erste Nachricht oben." : "Keine Einträge."}
          </p>
        ) : (
          <ul className="space-y-3" data-testid="team-communication-list">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                data-testid={`team-communication-item-${item.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-2)]">
                  <span>
                    {item.kind} · {item.status}
                  </span>
                  <time dateTime={item.publishedAt ?? item.createdAt}>
                    {formatTimestamp(item.publishedAt, item.createdAt)}
                  </time>
                </div>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {formatSender(item)}
                </p>
                {item.subject ? (
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {item.subject}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-2)]">
                  {item.bodyText}
                </p>
                {canSend && item.status === "PUBLISHED" ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await archiveTeamMessageAction(teamId, item.id);
                        })
                      }
                    >
                      Archivieren
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
