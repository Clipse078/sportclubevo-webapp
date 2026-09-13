import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BillingWorkspaceWidth = "list" | "detail" | "wide";

type Props = {
  children: ReactNode;
  width?: BillingWorkspaceWidth;
  className?: string;
};

const WIDTH_CLASS: Record<BillingWorkspaceWidth, string> = {
  /** Operational list pages — ~1200–1400px usable width on large viewports. */
  list: "max-w-[75rem] xl:max-w-[80rem] 2xl:max-w-[87.5rem]",
  /** Detail workspaces — ~1100–1280px. */
  detail: "max-w-[68.75rem] xl:max-w-[72rem] 2xl:max-w-[80rem]",
  /** Diagnostics (operations) — same horizontal rhythm as lists but full grid width. */
  wide: "max-w-[75rem] xl:max-w-[80rem] 2xl:max-w-[87.5rem]",
};

export default function BillingWorkspaceContent({
  children,
  width = "list",
  className,
}: Props) {
  return (
    <div className={cn("mx-auto w-full", WIDTH_CLASS[width], className)}>{children}</div>
  );
}
