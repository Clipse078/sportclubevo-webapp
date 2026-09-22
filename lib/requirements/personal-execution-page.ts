import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requirePersonalActionsModuleAccess } from "@/lib/personal-actions/require-module-access";
import { getRequirementServiceContext } from "./server-context";
import {
  RequirementForbiddenError,
  RequirementRecipientNotFoundError,
} from "./errors";
import { loadPersonalRequirementExecutionView } from "./personal-execution-service";
import { buildPersonalRequirementReturnHref } from "./personal-navigation";

export async function loadPersonalRequirementExecutionPageData(
  recipientId: string,
  searchParams: Record<string, string | undefined>,
) {
  await requirePersonalActionsModuleAccess();

  const ctx = await getRequirementServiceContext();
  if (!ctx) {
    return { kind: "unauthorized" as const };
  }

  const tenant = await getActiveTenant();
  const locale = tenant?.locale ?? "de-CH";
  const timeZone = tenant?.timezone ?? "Europe/Zurich";
  const backHref = buildPersonalRequirementReturnHref(searchParams);

  try {
    const view = await loadPersonalRequirementExecutionView(
      ctx,
      recipientId,
      locale,
      timeZone,
    );
    return {
      kind: "ok" as const,
      view,
      locale,
      timeZone,
      backHref,
    };
  } catch (error) {
    if (
      error instanceof RequirementRecipientNotFoundError ||
      error instanceof RequirementForbiddenError
    ) {
      return { kind: "not_found" as const };
    }
    throw error;
  }
}
