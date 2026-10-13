"use client";

import Link from "next/link";
import { resolveClubEventGovernanceStatusLabel } from "@/lib/veranstaltungen/club-event-governance-status-labels";

export type ClubEventComposerDraftListItem = {
  id: string;
  lifecycleState: string;
  title: string;
  updatedAt: string;
};

type Props = {
  drafts: ClubEventComposerDraftListItem[];
};

export default function ClubEventComposerDraftList({ drafts }: Props) {
  if (drafts.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
      data-testid="club-event-composer-draft-list"
    >
      <h2 className="text-sm font-semibold">Entwürfe und Freigaben</h2>
      <ul className="mt-3 space-y-2">
        {drafts.map((draft) => (
          <li key={draft.id}>
            <Link
              href={`/dashboard/veranstaltungen/new?draftId=${draft.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
              data-testid={`club-event-draft-resume-${draft.id}`}
            >
              <span className="font-medium">{draft.title?.trim() || "Veranstaltung ohne Titel"}</span>
              <span className="text-xs text-[var(--text-2)]">
                {resolveClubEventGovernanceStatusLabel(draft.lifecycleState)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
