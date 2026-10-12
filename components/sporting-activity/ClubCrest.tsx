"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { cn } from "@/lib/cn";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { resolveClubIdentityEffectiveLogoUrl } from "@/lib/sporting-activity-design/club-identity";
import type { SportingActivityDensity } from "@/lib/sporting-activity-design/density";

export type ClubCrestVisualSize = SportingActivityDensity | "detail";

const SIZE_CLASSES: Record<ClubCrestVisualSize, string> = {
  compact: "h-7 w-7 text-[0.5625rem]",
  planner: "h-11 w-11 text-[0.6875rem]",
  management: "h-9 w-9 text-[0.625rem]",
  detail: "h-[4.25rem] w-[4.25rem] text-[0.8125rem]",
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailedUrl(null);
    setLoaded(false);
  }, [initialUrl]);

  const onError = useCallback(() => {
    if (initialUrl) {
      setFailedUrl(initialUrl);
      setLoaded(false);
    }
  }, [initialUrl]);

  const onLoad = useCallback(() => {
    setLoaded(true);
  }, []);

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

  const showImage = loaded && failedUrl !== initialUrl;

  return (
    <span className={cn("relative inline-flex shrink-0", sizeClass, className)}>
      {!showImage ? (
        <ClubCrestFallback
          identity={identity}
          density={density}
          className="absolute inset-0"
          emphasized={emphasized}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- tenant/provider crest URLs */}
      <img
        src={logoUrl}
        alt={decorative ? "" : identity.displayName}
        aria-hidden={decorative ? true : undefined}
        title={identity.displayName}
        onError={onError}
        onLoad={onLoad}
        className={cn(
          sizeClass,
          "rounded-full border object-cover",
          emphasized ? "border-[var(--border-strong)]" : "border-[var(--border)]",
          !showImage && "opacity-0",
        )}
        data-testid="club-crest-image"
      />
    </span>
  );
}
