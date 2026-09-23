import type { PersonalContext } from "./types";
import type { PersonalCalendarItem } from "@/lib/personal-agenda/types";

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
};

export type PersonalProgrammeAdapterResult = {
  items: PersonalCalendarItem[];
};

export type PersonalProgrammeSourceAdapter = (
  ctx: PersonalProgrammeAdapterContext,
) => Promise<PersonalProgrammeAdapterResult>;
