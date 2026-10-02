"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { isSportingActivityDetailHref } from "@/lib/sporting-activity-detail/href";
import { useOptionalSportingActivityDetail } from "./SportingActivityDetailProvider";

type SportingActivityDetailLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Opens Activity Detail in the contextual sheet when a provider is mounted;
 * otherwise navigates to the canonical detail route.
 */
export function SportingActivityDetailLink({
  href,
  onClick,
  children,
  ...rest
}: SportingActivityDetailLinkProps) {
  const detail = useOptionalSportingActivityDetail();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    if (!detail || !isSportingActivityDetailHref(href)) {
      return;
    }
    event.preventDefault();
    detail.openFromHref(href, event.currentTarget);
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
