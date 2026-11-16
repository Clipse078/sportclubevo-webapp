import type { PersonalContext } from "./types";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type { TenantProgrammeBranding } from "@/lib/personal-agenda/tenant-programme-branding";

/**
 * DASHBOARD-02 programme source adapter input contract.
 * Adapters consume resolved personal context + authorization context;
 * they must not re-resolve identity or treat permissions as relevance.
 */
export type PersonalProgrammeAdapterContext = {
  personal: PersonalContext;
  /** Effective permission keys for the actor in the active tenant. */
  permissionKeys: string[];
  timeZone: string;
  rangeStart: Date;
  rangeEnd: Date;
  /** Authorised tenant club branding loaded once per programme request. */
  tenantBranding: TenantProgrammeBranding;
};

export type PersonalProgrammeAdapterResult = {
  items: PersonalProgrammeItem[];
};

export type PersonalProgrammeSourceAdapter = (
  ctx: PersonalProgrammeAdapterContext,
) => Promise<PersonalProgrammeAdapterResult>;
