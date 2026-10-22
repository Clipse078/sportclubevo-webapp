"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type FinanceCapabilityNavProps = {
  items: ReadonlyArray<{ key: string; href: string; labelKey: string }>;
};

export function FinanceCapabilityNav({ items }: FinanceCapabilityNavProps) {
  const pathname = usePathname();
  const t = useTranslations("Finance");

  if (items.length <= 1) return null;

  return (
    <nav
      aria-label={t("capabilityNavAria")}
      className="mb-4 flex flex-wrap gap-2 border-b border-[var(--sce-color-border-standard)] pb-3"
      data-testid="finance-capability-nav"
    >
      {items.map((item) => {
        const active =
          item.href === "/dashboard/finance"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
            aria-current={active ? "page" : undefined}
          >
            {t(item.labelKey as "nav.overview")}
          </Link>
        );
      })}
    </nav>
  );
}
