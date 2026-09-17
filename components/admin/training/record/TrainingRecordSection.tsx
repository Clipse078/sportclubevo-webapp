import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

export default function TrainingRecordSection({
  id,
  title,
  description,
  children,
  className,
  testId,
}: Props) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 px-4 py-4 md:px-5 md:py-5", className)}
      data-testid={testId}
    >
      <div className="mb-3 space-y-0.5">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
        {description ? <p className="text-xs text-[var(--text-2)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
