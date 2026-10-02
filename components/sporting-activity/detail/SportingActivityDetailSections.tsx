"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ActivityDetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-[var(--border)] pt-4", className)}>
      <h3 className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ActivityDetailInfoList({
  items,
}: {
  items: readonly { label: string; value: string }[];
}) {
  return (
    <dl className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[0.75rem] font-medium text-[var(--text-2)]">{item.label}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-[0.875rem] text-[var(--foreground)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
