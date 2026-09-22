"use client";

import Link from "next/link";
import { CalendarClock, ClipboardCheck, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PersonalActionListItem } from "@/lib/personal-actions/presentation";
import PersonalActionParticipationInline from "./PersonalActionParticipationInline";
import PersonalActionRequirementInline from "./PersonalActionRequirementInline";

type Props = {
  item: PersonalActionListItem;
  compact?: boolean;
};

export default function PersonalActionRow({ item, compact = false }: Props) {
  const Icon =
    item.sourceType === "TASK"
      ? ListChecks
      : item.sourceType === "REQUIREMENT"
        ? ClipboardCheck
        : CalendarClock;
  const emphasisClass =
    item.emphasis === "urgent"
      ? "text-[var(--destructive)]"
      : item.emphasis === "attention"
        ? "text-[var(--sce-warning)]"
        : "text-[var(--muted-foreground)]";

  const inner = (
    <>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--text-2)]"
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[0.875rem] font-medium leading-snug text-[var(--foreground)]">
              {item.title}
            </p>
            <span className="text-[0.6875rem] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {item.sourceLabel}
            </span>
          </div>
          {item.subtitle ? (
            <p className="mt-0.5 text-[0.8125rem] text-[var(--text-2)]">{item.subtitle}</p>
          ) : null}
          {item.metaLine ? (
            <p className={cn("mt-0.5 text-[0.75rem]", emphasisClass)}>{item.metaLine}</p>
          ) : null}
          {item.inlineRequirement ? (
            <PersonalActionRequirementInline requirement={item.inlineRequirement} />
          ) : item.inlineRequirementReady ? (
            <div
              className="mt-2 min-h-[2rem]"
              data-testid="personal-action-inline-requirement-slot"
              data-inline-requirement-ready="true"
            />
          ) : null}
          {item.inlineParticipation ? (
            <PersonalActionParticipationInline participation={item.inlineParticipation} />
          ) : item.inlineParticipationReady ? (
            <div
              className="mt-2 min-h-[2rem]"
              data-testid="personal-action-inline-slot"
              data-inline-participation-ready="true"
            />
          ) : null}
        </div>
      </div>
    </>
  );

  const rowClass = cn(
    "flex w-full items-start gap-2 rounded-lg border border-transparent px-2 py-2.5 transition-colors",
    compact ? "py-2" : "sm:px-3",
    item.href && "hover:border-[var(--border)] hover:bg-[var(--surface)]/60",
  );

  if (item.href) {
    return (
      <Link href={item.href} className={rowClass} data-testid={`personal-action-${item.id}`}>
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={rowClass}
      data-testid={`personal-action-${item.id}`}
      role="group"
      aria-label={item.title}
    >
      {inner}
    </div>
  );
}
