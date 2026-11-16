import type { ReactNode } from "react";

type Props = {
  message: string;
  action?: ReactNode;
  testId?: string;
};

export default function UmsetzungsplanungInlineEmpty({ message, action, testId }: Props) {
  return (
    <p
      className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 py-1 text-sm text-[var(--muted)]"
      data-testid={testId}
    >
      <span>{message}</span>
      {action}
    </p>
  );
}