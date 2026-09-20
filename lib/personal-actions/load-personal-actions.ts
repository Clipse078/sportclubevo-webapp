import { dedupePersonalActionsById, sortPersonalActions } from "./ordering";
import { resolvePersonalActionSourceContext } from "./load-context";
import { personalActionSources } from "./sources";
import type { LoadPersonalActionsArgs, PersonalAction } from "./types";

export const DASHBOARD_PERSONAL_ACTION_PREVIEW_LIMIT = 5;

export async function loadPersonalActions(
  args: LoadPersonalActionsArgs,
): Promise<PersonalAction[]> {
  const ctx = await resolvePersonalActionSourceContext(args);

  const chunks = await Promise.all(
    personalActionSources.map((source) => source.loadActionable(ctx)),
  );

  const merged = dedupePersonalActionsById(chunks.flat());
  const ordered = sortPersonalActions(merged, ctx.now);

  if (args.limit != null && args.limit > 0) {
    return ordered.slice(0, args.limit);
  }
  return ordered;
}

export async function loadDashboardPersonalActions(
  args: Omit<LoadPersonalActionsArgs, "limit">,
): Promise<PersonalAction[]> {
  return loadPersonalActions({
    ...args,
    limit: DASHBOARD_PERSONAL_ACTION_PREVIEW_LIMIT,
  });
}
