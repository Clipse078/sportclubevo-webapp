import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  testId?: string;
  align?: "start" | "end" | "between";
};

export default function PlanningEditorActions({
  children,
  className,
  testId,
  align = "start",
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 pt-1",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
