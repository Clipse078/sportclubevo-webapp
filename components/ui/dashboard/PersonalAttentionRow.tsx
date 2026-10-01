"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardCheck } from "lucide-react";
import {
  CommunicationSceIcon,
  NotificationsSceIcon,
  TasksSceIcon,
} from "@/components/icons/domain-sce-icon-components";
import { cn } from "@/lib/cn";
import type { PersonalAttentionItem } from "@/lib/dashboard/personal-attention";
import { PersonalAttentionOperationalActionButton } from "./PersonalAttentionOperationalActionButton";

const SOURCE_ICON: Record<
  string,
  { icon: ComponentType<{ className?: string }>; accent: string; bg: string }
> = {
  TASK: {
    icon: TasksSceIcon,
    accent: "var(--sce-primary)",
    bg: "var(--sce-primary-light)",
  },
  ATTENDANCE_RESPONSE: {
    icon: CalendarClock,
    accent: "var(--sce-warning)",
    bg: "var(--sce-warning-light)",
  },
  REQUIREMENT: {
    icon: ClipboardCheck,
    accent: "var(--sce-info)",
    bg: "var(--sce-info-light)",
  },
  DOMAIN_OPERATIONAL: {
    icon: CommunicationSceIcon,
    accent: "var(--sce-warning)",
    bg: "var(--sce-warning-light)",
  },
};

export type PersonalAttentionRowProps = {
  item: PersonalAttentionItem;
  overdueLabel: string;
  dueTodayLabel: string;
  ariaLabel: string;
};

function urgencyPrefix(
  item: PersonalAttentionItem,
  overdueLabel: string,
  dueTodayLabel: string,
): string | null {
  if (item.urgency === "overdue") return overdueLabel;
  if (item.urgency === "due_today") return dueTodayLabel;
  return null;
}

export function PersonalAttentionRow({
  item,
  overdueLabel,
  dueTodayLabel,
  ariaLabel,
}: PersonalAttentionRowProps) {
  const iconConfig = SOURCE_ICON[item.sourceType] ?? {
    icon: NotificationsSceIcon,
    accent: "var(--sce-primary)",
    bg: "var(--sce-primary-light)",
  };
  const Icon = iconConfig.icon;
  const prefix = urgencyPrefix(item, overdueLabel, dueTodayLabel);

  const operationalCta =
    item.operationalAction && item.actionLabel ? (
      <PersonalAttentionOperationalActionButton
        attentionId={item.id}
        actionKey={item.operationalAction.actionKey}
        label={item.actionLabel}
      />
    ) : null;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] py-3 last:border-b-0",
        "motion-safe:transition-colors motion-safe:duration-150 motion-safe:hover:bg-[var(--surface-2)] -mx-1.5 rounded-md px-1.5",
      )}
    >
      <Link
        href={item.deepLink}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-3 no-underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] rounded-md",
        )}
        aria-label={ariaLabel}
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{ backgroundColor: iconConfig.bg, color: iconConfig.accent }}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
            {prefix ? (
              <>
                <span className="sr-only">{prefix}. </span>
                <span aria-hidden="true">{prefix} · </span>
                {item.title}
              </>
            ) : (
              item.title
            )}
          </p>
          {item.summary ? (
            <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--muted)]">{item.summary}</p>
          ) : null}
          {item.presentationStatus && item.sourceType !== "DOMAIN_OPERATIONAL" ? (
            <p className="mt-0.5 text-[0.75rem] font-medium leading-relaxed text-[var(--muted-foreground)]">
              {item.presentationStatus}
            </p>
          ) : null}
          {item.contextLabel ? (
            <p className="mt-0.5 text-[0.6875rem] uppercase tracking-wide text-[var(--muted)]">
              {item.contextLabel}
            </p>
          ) : null}
        </div>
        {!operationalCta ? (
          <ChevronRight
            className="mt-2 h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
            aria-hidden="true"
          />
        ) : null}
      </Link>
      {operationalCta}
    </div>
  );
}
