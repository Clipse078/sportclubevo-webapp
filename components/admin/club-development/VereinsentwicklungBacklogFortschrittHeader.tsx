type Props = {
  unitShortLabel: string;
};

export default function VereinsentwicklungBacklogFortschrittHeader({ unitShortLabel }: Props) {
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span>Fortschritt</span>
      <span className="text-[0.6rem] font-normal normal-case tracking-normal text-[var(--muted)]">
        {unitShortLabel}
      </span>
    </span>
  );
}