export type SceDenseResultCountProps = {
  shown: number;
  total: number;
  label?: string;
};

export function SceDenseResultCount({ shown, total, label = "Einträge" }: SceDenseResultCountProps) {
  return (
    <p className="text-sm text-[var(--muted)]" role="status" data-sce-dense-result-count="true">
      {shown} von {total} {label}
    </p>
  );
}
