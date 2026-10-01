import type { PersonalAction, PersonalActionSourceType } from "../types";

export type PersonalActionSourceContext = {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
  now: Date;
  /** When set, adapters skip re-resolving participation person scope. */
  authorizedPersonIds?: readonly string[];
  /** Caps rows materialized for dashboard hot paths (counts may still be exact). */
  actionableItemCap?: number;
};

export interface PersonalActionSourceAdapter {
  readonly sourceType: PersonalActionSourceType;
  loadActionable(ctx: PersonalActionSourceContext): Promise<PersonalAction[]>;
  countActionable(ctx: PersonalActionSourceContext): Promise<number>;
}
