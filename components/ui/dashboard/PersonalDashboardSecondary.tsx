"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, Globe, Newspaper, ScrollText } from "lucide-react";
import type { CommandCenterNewsItem } from "@/lib/dashboard/command-center-presentation";
import { DashboardNewsSection } from "./DashboardNewsGrid";
import { DashboardActivityFeed, type DashboardActivityItem } from "./DashboardActivityFeed";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { cn } from "@/lib/cn";

export type PersonalDashboardSecondaryProps = {
  newsItems: CommandCenterNewsItem[];
  activityItems: DashboardActivityItem[];
  className?: string;
};

export function PersonalDashboardSecondary({
  newsItems,
  activityItems,
  className,
}: PersonalDashboardSecondaryProps) {
  const t = useTranslations("PersonalDashboard.secondary");

  if (newsItems.length === 0 && activityItems.length === 0) {
    return null;
  }

  return (
    <details
      className={cn(
        "group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 sm:px-5",
        className,
      )}
      data-testid="personal-dashboard-secondary"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1.5 text-sm font-medium text-[var(--text-2)] marker:content-none [&::-webkit-details-marker]:hidden">
        <span>{t("summary")}</span>
        <ChevronDown className="h-4 w-4 shrink-0 motion-safe:transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="mt-2 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-3 lg:grid-cols-2 lg:gap-5">
        {newsItems.length > 0 ? (
          <section aria-labelledby="dashboard-secondary-news">
            <div className="mb-2 flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden />
              <h2 id="dashboard-secondary-news" className="text-sm font-semibold">
                {t("newsTitle")}
              </h2>
            </div>
            <DashboardNewsSection
              items={newsItems}
              variant="compact"
              maxItems={2}
              embedded
            />
            <Link href="/dashboard/website/news" className="sce-link-primary mt-2 inline-block text-[0.8125rem]">
              {t("newsViewAll")}
            </Link>
          </section>
        ) : null}

        <section aria-labelledby="dashboard-secondary-activity">
          <div className="mb-2 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[var(--muted)]" aria-hidden />
            <h2 id="dashboard-secondary-activity" className="text-sm font-semibold">
              {t("activityTitle")}
            </h2>
          </div>
          <DashboardActivityFeed
            items={activityItems}
            emptyState={
              <DashboardEmptyState
                icon={<Globe className="h-5 w-5" />}
                title={t("activityEmptyTitle")}
                description={t("activityEmptyDescription")}
                variant="compact"
              />
            }
          />
          {activityItems.length > 0 ? (
            <Link href="/dashboard/logs" className="sce-link-primary mt-2 inline-block text-[0.8125rem]">
              {t("activityViewAll")}
            </Link>
          ) : null}
        </section>
      </div>
    </details>
  );
}
