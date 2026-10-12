"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { cn } from "@/lib/cn";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { resolveClubIdentityEffectiveLogoUrl } from "@/lib/sporting-activity-design/club-identity";
import type { SportingActivityDensity } from "@/lib/sporting-activity-design/density";

export type ClubCrestVisualSize = SportingActivityDensity | "detail";

/** Square layout bounds — real logos use object-contain inside (not circular pills). */
const BOUNDS_CLASSES: Record<ClubCrestVisualSize, string> = {
  compact: "h-8 w-8",
  planner: "h-12 w-12",
  management: "h-10 w-10",
  detail: "h-[5rem] w-[5rem]",
};

const FALLBACK_SIZE_CLASSES: Record<ClubCrestVisualSize, string> = {
  compact: "h-8 w-8 text-[0.5625rem]",
  planner: "h-12 w-12 text-[0.75rem]",
  management: "h-10 w-10 text-[0.625rem]",
  detail: "h-[5rem] w-[5rem] text-[0.875rem]",
};

const ICON_SIZE = {
  compact: 12,
  planner: 24,
  management: 16,
  detail: 32,
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
  const sizeClass = FALLBACK_SIZE_CLASSES[density ?? "management"];
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
 * Real crests render naturally (object-contain); fallbacks may use circular treatment.
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
  const boundsClass = BOUNDS_CLASSES[density];

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
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        boundsClass,
        className,
      )}
      data-testid="club-crest-bounds"
    >
      {!showImage ? (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <ClubCrestFallback
            identity={identity}
            density={density}
            emphasized={emphasized}
          />
        </span>
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
          "relative z-[1] max-h-full max-w-full object-contain transition-opacity duration-150",
          showImage ? "opacity-100" : "opacity-0",
        )}
        data-testid="club-crest-image"
      />
    </span>
  );
}
