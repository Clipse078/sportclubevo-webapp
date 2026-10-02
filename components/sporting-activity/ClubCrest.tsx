"use client";

import { useCallback, useState } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { cn } from "@/lib/cn";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { resolveClubIdentityEffectiveLogoUrl } from "@/lib/sporting-activity-design/club-identity";
import type { SportingActivityDensity } from "@/lib/sporting-activity-design/density";

export type ClubCrestVisualSize = SportingActivityDensity | "detail";

const SIZE_CLASSES: Record<ClubCrestVisualSize, string> = {
  compact: "h-7 w-7 text-[0.5625rem]",
  planner: "h-10 w-10 text-[0.625rem]",
  management: "h-8 w-8 text-[0.625rem]",
  detail: "h-16 w-16 text-[0.75rem]",
};

const ICON_SIZE = {
  compact: 12,
  planner: 20,
  management: 16,
  detail: 24,
} as const;

export type ClubCrestProps = {
  identity: ClubIdentity;
  density?: ClubCrestVisualSize;
  /** When true, crest is redundant with adjacent visible club name text. */
  decorative?: boolean;
  className?: string;
  emphasized?: boolean;
};

function ClubCrestFallback({
  identity,
  density,
  className,
  emphasized,
}: Omit<ClubCrestProps, "decorative">) {
  const sizeClass = SIZE_CLASSES[density ?? "management"];
  const containerClassName = cn(
    sizeClass,
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-semibold uppercase tracking-wide",
    emphasized
      ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-2)]"
      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
    className,
  );

  if (identity.fallbackIdentity.kind === "initials") {
    return (
      <span
        role="img"
        aria-label={identity.displayName}
        title={identity.displayName}
        className={containerClassName}
        data-testid="club-crest-fallback-initials"
      >
        {identity.fallbackIdentity.label}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={identity.displayName}
      title={identity.displayName}
      className={containerClassName}
      data-testid="club-crest-fallback-icon"
    >
      <ProductDomainSceIcon
        name="roles-access"
        size={ICON_SIZE[density ?? "management"]}
      />
    </span>
  );
}

/**
 * Canonical club crest primitive — resolved logo or intentional initials/icon fallback.
 * Never renders a broken image (failed loads revert to fallback).
 */
export function ClubCrest({
  identity,
  density = "management",
  decorative = false,
  className,
  emphasized = false,
}: ClubCrestProps) {
  const initialUrl = resolveClubIdentityEffectiveLogoUrl(identity);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const onError = useCallback(() => {
    if (initialUrl) {
      setFailedUrl(initialUrl);
    }
  }, [initialUrl]);

  const logoUrl = initialUrl && failedUrl !== initialUrl ? initialUrl : null;
  const sizeClass = SIZE_CLASSES[density];

  if (!logoUrl) {
    return (
      <ClubCrestFallback
        identity={identity}
        density={density}
        className={className}
        emphasized={emphasized}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- tenant/provider crest URLs
    <img
      src={logoUrl}
      alt={decorative ? "" : identity.displayName}
      aria-hidden={decorative ? true : undefined}
      title={identity.displayName}
      onError={onError}
      className={cn(
        sizeClass,
        "shrink-0 rounded-full border object-cover",
        emphasized ? "border-[var(--border-strong)]" : "border-[var(--border)]",
        className,
      )}
      data-testid="club-crest-image"
    />
  );
}
