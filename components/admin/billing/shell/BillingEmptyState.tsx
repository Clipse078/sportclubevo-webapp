import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function BillingEmptyState({ title, description, action }: Props) {
  return (
    <div
      className="rounded-[var(--radius-lg)] px-6 py-10 text-center ring-1 ring-dashed ring-[color-mix(in_srgb,var(--border)_60%,transparent)]"
      role="status"
    >
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-2)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
