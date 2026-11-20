/** DS2-07F governance marker: SceWorkspaceChrome (create panel chrome). */
import type { SceWorkspaceChromeProps } from "@/components/sce/workspace/SceWorkspaceChrome";
void 0 as unknown as SceWorkspaceChromeProps;
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import StrategieNeuClient from "@/components/admin/club-development/StrategieNeuClient";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { loadTaskOrgUnitMutationOptions } from "@/lib/tasks/task-org-options";
import { parseOrgEinheitQuery } from "@/lib/club-development/vereinsentwicklung-workspace-org-filter";
import {
  buildStrategieReturnHref,
  parseSafeReturnToHref,
} from "@/lib/club-development/vereinsentwicklung-create-routing";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function VereinsentwicklungStrategieNeuPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const query = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, session.user.activeTenantId ?? undefined);
  if (!actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE)) {
    redirect(buildStrategieReturnHref({ orgUnitId: parseOrgEinheitQuery(query) }));
  }

  const orgUnitId = parseOrgEinheitQuery(query) ?? null;
  const taskCtx =
    actor.tenantId && session.user.id
      ? await buildTaskServiceContextForActor(session.user.id, actor.tenantId)
      : null;
  const orgUnitOptions = taskCtx ? await loadTaskOrgUnitMutationOptions(taskCtx) : [];

  const backHref = parseSafeReturnToHref(
    query.returnTo,
    buildStrategieReturnHref({ orgUnitId }),
  );

  return (
    <StrategieNeuClient backHref={backHref} orgUnitId={orgUnitId} orgUnitOptions={orgUnitOptions} />
  );
}