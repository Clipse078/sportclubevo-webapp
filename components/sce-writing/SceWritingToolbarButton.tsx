"use client";

import type { ReactNode } from "react";

export function SceWritingToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  testId,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition
        ${active ? "bg-[var(--brand-primary,#f97316)] text-white" : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"}
        ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}