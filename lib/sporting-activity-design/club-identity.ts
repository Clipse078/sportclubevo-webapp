import { deriveClubIdentityFallbackLabel } from "./fallback-label";

export type ClubIdentityFallbackKind = "initials" | "neutral-icon";

export type ClubIdentityFallback = {
  kind: ClubIdentityFallbackKind;
  /** Initials or short label shown when logoUrl is absent or fails to load. */
  label: string;
};

/**
 * Presentation-level club identity — not every instance maps to a persisted SCE tenant.
 * Adapters derive this from tenant branding, Club Directory, event metadata, or name-only sources.
 */
export type ClubIdentity = {
  id?: string;
  externalAssociationId?: string | number | null;
  displayName: string;
  shortName?: string | null;
  logoUrl?: string | null;
  fallbackIdentity: ClubIdentityFallback;
};

export type BuildClubIdentityInput = {
  id?: string;
  externalAssociationId?: string | number | null;
  displayName: string;
  shortName?: string | null;
  logoUrl?: string | null;
  /** When true, prefer neutral icon over initials (rare — name unknown). */
  preferNeutralIcon?: boolean;
};

export function buildClubIdentity(input: BuildClubIdentityInput): ClubIdentity {
  const displayName = input.displayName.trim();
  const label = deriveClubIdentityFallbackLabel(displayName, input.shortName);

  return {
    id: input.id,
    externalAssociationId: input.externalAssociationId ?? null,
    displayName: displayName || input.shortName?.trim() || "Unbekannt",
    shortName: input.shortName?.trim() || null,
    logoUrl: input.logoUrl?.trim() || null,
    fallbackIdentity: input.preferNeutralIcon
      ? { kind: "neutral-icon", label }
      : { kind: "initials", label },
  };
}

export function resolveClubIdentityEffectiveLogoUrl(
  identity: Pick<ClubIdentity, "logoUrl">,
): string | null {
  const url = identity.logoUrl?.trim();
  return url || null;
}
