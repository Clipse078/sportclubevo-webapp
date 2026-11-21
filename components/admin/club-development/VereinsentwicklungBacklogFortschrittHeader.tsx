type Props = {
  /** @deprecated Prefer `label` for single Aufgabenfortschritt column header. */
  unitShortLabel?: string;
  label?: string;
};

export default function VereinsentwicklungBacklogFortschrittHeader({ unitShortLabel, label }: Props) {
  if (label?.trim()) {
    return <span>{label}</span>;
  }
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span>Fortschritt</span>
      <span className="text-[0.6rem] font-normal normal-case tracking-normal text-[var(--muted)]">
        {unitShortLabel}
      </span>
    </span>
  );
}