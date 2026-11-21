type Props = {
  reference: string | null;
  testId?: string;
};

export default function VereinsentwicklungBacklogReferenceCell({ reference, testId }: Props) {
  if (!reference?.trim()) {
    return (
      <span data-testid={testId} className="text-xs text-[var(--muted)]" aria-hidden>
        —
      </span>
    );
  }
  return (
    <span
      data-testid={testId}
      className="min-w-0 truncate font-mono text-[0.68rem] font-medium tabular-nums tracking-tight text-[var(--text-2)]"
      title={reference}
    >
      {reference}
    </span>
  );
}