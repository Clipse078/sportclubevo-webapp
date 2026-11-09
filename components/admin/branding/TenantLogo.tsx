/**
 * TenantLogo — Slice 10.9
 *
 * Canonical logo rendering component for all surfaces (sidebar, cockpit header, etc.).
 *
 * ─── Rendering logic ─────────────────────────────────────────────────────────
 *
 * When logoUrl is a valid URL/path → renders <img> with the tenant logo.
 * Otherwise → renders the platform fallback (Trophy icon on --tenant-primary bg).
 *
 * ─── No duplication ──────────────────────────────────────────────────────────
 *
 * All surfaces that need a tenant logo MUST use this component.
 * No inline logo rendering elsewhere in the codebase.
 *
 * ─── Client safety ───────────────────────────────────────────────────────────
 *
 * This is a client component ("use client") so it can be used inside
 * existing client components (AdminSidebar) without wrapping.
 */

"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";
import { headerCrestBox } from "@/lib/branding/sce-header-crest-layout";
import { isValidLogoUrl } from "@/lib/tenant-runtime/branding-validation";
import { cn } from "@/lib/cn";

type TenantLogoProps = {
  /** Raw logoUrl from tenant config. Null/invalid → fallback icon. */
  logoUrl: string | null | undefined;
  /** Display size in pixels (applies to both width and height). Default: 32 */
  size?: number;
  /** Alt text for the logo image. Default: "Club logo" */
  alt?: string;
  /** Additional className for the wrapper element. */
  className?: string;
  /**
   * `platform-icon` — legacy sidebar trophy tile.
   * `header-crest` — transparent nav crest; initials when no URL resolves.
   */
  variant?: "platform-icon" | "header-crest";
  /** Used for header-crest initials when logoUrl is missing/invalid. */
  displayName?: string;
};

/**
 * Renders the tenant logo when logoUrl is valid, otherwise the platform fallback icon.
 *
 * @example
 *   <TenantLogo logoUrl={ctx?.logoUrl} size={32} />
 */
function headerCrestInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SC";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

export default function TenantLogo({
  logoUrl,
  size = 32,
  alt = "Club logo",
  className,
  variant = "platform-icon",
  displayName,
}: TenantLogoProps) {
  const hasLogo = isValidLogoUrl(logoUrl);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const iconSize = Math.round(size * 0.44); // scale inner icon proportionally
  const imageFailed = hasLogo && brokenUrl === logoUrl;

  if (variant === "header-crest") {
    const showImage = hasLogo && !imageFailed;
    const initials = headerCrestInitials(displayName ?? alt);
    return (
      <span
        className={cn("sce-tenant-header-crest", className)}
        data-testid="tenant-header-crest"
        style={{
          ...headerCrestBox(size),
          ...(showImage
            ? null
            : {
                border:
                  "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
                borderRadius: 4,
              }),
        }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl!}
            alt={alt}
            width={size}
            height={size}
            data-testid="tenant-logo-image"
            onError={() => setBrokenUrl(logoUrl ?? null)}
          />
        ) : (
          <span
            data-testid="tenant-logo-header-initials"
            aria-hidden="true"
            style={{
              fontSize: Math.max(10, Math.round(size * 0.34)),
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-2)",
            }}
          >
            {initials}
          </span>
        )}
      </span>
    );
  }

  if (hasLogo && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl!}
        alt={alt}
        width={size}
        height={size}
        className={className}
        data-testid="tenant-logo-image"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          borderRadius: 6,
          display: "block",
          background: "transparent",
        }}
        onError={() => setBrokenUrl(logoUrl ?? null)}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        background: "var(--tenant-primary)",
        color: "#fff",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <Trophy style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}
