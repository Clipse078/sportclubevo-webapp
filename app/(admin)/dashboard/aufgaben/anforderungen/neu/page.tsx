import { redirect } from "next/navigation";
import RequirementCreateClient from "@/components/admin/aufgaben/RequirementCreateClient";
import { canCreateRequirement } from "@/lib/requirements/requirement-authorization";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { requirePersonalActionsModuleAccess } from "@/lib/personal-actions/require-module-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";

export const dynamic = "force-dynamic";

export default async function RequirementCreatePage() {
  await requirePersonalActionsModuleAccess();
  const ctx = await getRequirementServiceContext();
  if (!ctx || !canCreateRequirement(ctx)) {
    redirect("/dashboard/aufgaben?bereich=anforderungen");
  }

  const tenant = await getActiveTenant();
  const timeZone = tenant?.timezone ?? "Europe/Zurich";

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <RequirementCreateClient timeZone={timeZone} />
    </div>
  );
}
