type Props = {
  id?: string;
  title: string;
  description?: string;
};

export default function PlanningEditorSectionHeading({ id, title, description }: Props) {
  return (
    <div className="space-y-0.5">
      <h2 id={id} className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
        {title}
      </h2>
      {description ? <p className="text-xs text-[var(--text-2)]">{description}</p> : null}
    </div>
  );
}
