"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SCE_BREADCRUMBS_COLLAPSED_ANCESTOR_CLASS,
  SCE_BREADCRUMBS_CURRENT_CLASS,
  SCE_BREADCRUMBS_LINK_CLASS,
  SCE_BREADCRUMBS_LIST_CLASS,
  SCE_BREADCRUMBS_MOBILE_BACK_CLASS,
  SCE_BREADCRUMBS_NAV_CLASS,
  SCE_BREADCRUMBS_SEPARATOR_CLASS,
} from "@/lib/design-system/sce-breadcrumbs-foundation";

export type SceBreadcrumbItem = {
  label: string;
  href?: string;
};

type SceBreadcrumbsProps = {
  items: SceBreadcrumbItem[];
  className?: string;
  /** Accessible name — defaults to German product label. */
  ariaLabel?: string;
};

function BreadcrumbSeparator() {
  return (
    <ChevronRight
      className={SCE_BREADCRUMBS_SEPARATOR_CLASS}
      aria-hidden="true"
    />
  );
}

/**
 * Canonical SCE breadcrumb trail — hierarchy wayfinding (WHERE am I?).
 * Responsive: on small viewports shows parent back-link + current context;
 * full trail from `sm` upward (wrapped/truncated).
 */
export function SceBreadcrumbs({
  items,
  className,
  ariaLabel = "Brotkrumen",
}: SceBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  const lastIndex = items.length - 1;
  const parentItem = items.length > 1 ? items[items.length - 2] : null;
  const currentItem = items[lastIndex];

  return (
    <nav aria-label={ariaLabel} className={cn(SCE_BREADCRUMBS_NAV_CLASS, className)}>
      {parentItem?.href ? (
        <Link href={parentItem.href} className={SCE_BREADCRUMBS_MOBILE_BACK_CLASS}>
          <ChevronRight className="h-3.5 w-3.5 rotate-180 shrink-0" aria-hidden />
          <span className="truncate">{parentItem.label}</span>
        </Link>
      ) : null}

      <ol className={cn(SCE_BREADCRUMBS_LIST_CLASS, "hidden sm:flex")}>
        {items.map((item, index) => {
          const isLast = index === lastIndex;
          const showCollapsedPrefix =
            items.length > 3 && index === 0 && !isLast;

          if (showCollapsedPrefix) {
            return (
              <li key={`${index}-ellipsis`} className="flex items-center gap-1">
                {item.href ? (
                  <Link href={item.href} className={SCE_BREADCRUMBS_LINK_CLASS} title={item.label}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={SCE_BREADCRUMBS_COLLAPSED_ANCESTOR_CLASS} title={item.label}>
                    {item.label}
                  </span>
                )}
                <BreadcrumbSeparator />
                <span
                  className="text-xs font-medium text-[var(--sce-color-text-muted)]"
                  aria-hidden="true"
                >
                  …
                </span>
                <BreadcrumbSeparator />
              </li>
            );
          }

          if (items.length > 3 && index > 0 && index < lastIndex - 1) {
            return null;
          }

          return (
            <li key={index} className="flex min-w-0 max-w-full items-center gap-1">
              {index > 0 ? <BreadcrumbSeparator /> : null}
              {isLast || !item.href ? (
                <span
                  className={cn(SCE_BREADCRUMBS_CURRENT_CLASS, "max-w-[min(100%,14rem)]")}
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className={SCE_BREADCRUMBS_LINK_CLASS} title={item.label}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <p className="truncate text-xs font-medium text-[var(--sce-color-text-primary)] sm:hidden">
        <span className="sr-only">{ariaLabel}: </span>
        {currentItem.label}
      </p>
    </nav>
  );
}
