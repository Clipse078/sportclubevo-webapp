import type { PersonalAction, PersonalActionSourceType } from "../types";

export type PersonalActionSourceContext = {
  tenantId: string;
  userId: string;
  permissionKeys: readonly string[];
  now: Date;
};

export interface PersonalActionSourceAdapter {
  readonly sourceType: PersonalActionSourceType;
  loadActionable(ctx: PersonalActionSourceContext): Promise<PersonalAction[]>;
  countActionable(ctx: PersonalActionSourceContext): Promise<number>;
}
