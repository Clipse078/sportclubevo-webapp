import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import PersonForm from "@/components/admin/persons/PersonForm";
import { PageShell } from "@/components/ui/page";

/** DS2-07A — PersonForm composes FormPagePattern + SceWorkspaceChrome (client boundary). */
export default async function NewPersonPage() {
  await requirePermission(PERMISSIONS.PEOPLE_MANAGE);

  return (
    <PageShell fullWidth>
      <PersonForm mode="create" />
    </PageShell>
  );
}
