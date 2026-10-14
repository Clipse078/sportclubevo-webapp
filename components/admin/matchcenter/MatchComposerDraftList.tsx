import Link from "next/link";

export type MatchComposerDraftListItem = {
  id: string;
  lifecycleState: string;
  title: string;
  updatedAt: string;
};

type Props = {
  drafts: MatchComposerDraftListItem[];
};

export default function MatchComposerDraftList({ drafts }: Props) {
  if (drafts.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--border)] p-4" data-testid="match-composer-draft-list">
      <h2 className="text-sm font-semibold">Spiel-Entwürfe</h2>
      <ul className="mt-2 space-y-2">
        {drafts.map((draft) => (
          <li key={draft.id}>
            <Link
              href={`/dashboard/matchcenter/new?draftId=${encodeURIComponent(draft.id)}`}
              className="block rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
              data-testid={`match-composer-draft-${draft.id}`}
            >
              <span className="font-medium">{draft.title}</span>
              <span className="ml-2 text-xs text-[var(--text-2)]">{draft.lifecycleState}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
