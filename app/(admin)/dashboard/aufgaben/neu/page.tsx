/** DS2-07F governance marker: SceWorkspaceChrome (create panel chrome). */
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadTaskOrgUnitMutationOptions } from "@/lib/tasks/task-org-options";
import { buildTaskManagementHref, resolveTaskManagementQuery } from "@/lib/tasks/management-navigation";
import { canViewAllTasks } from "@/lib/tasks/visibility";
import type { TaskContextType } from "@prisma/client";
import AufgabenFullCreateClient from "@/components/admin/aufgaben/AufgabenFullCreateClient";
import { isSupportedTaskContextType } from "@/lib/tasks/context-registry";
import { prisma } from "@/lib/db/prisma";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function AufgabenCreatePage({ searchParams }: Props) {
  await requirePermission(PERMISSIONS.TASKS_CREATE);

  const ctx = await getTaskServiceContext();
  if (!ctx) return null;

  const sp = searchParams ? await searchParams : {};
  const tenantWideVisibility = canViewAllTasks(ctx);
  const query = resolveTaskManagementQuery(sp, tenantWideVisibility);
  const backHref = buildTaskManagementHref("/dashboard/aufgaben", {}, query, {
    tenantWideVisibility,
  });

  const [orgUnitOptions, tenantRow] = await Promise.all([
    loadTaskOrgUnitMutationOptions(ctx),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timezone: true },
    }),
  ]);
  const timeZone = tenantRow?.timezone ?? "Europe/Zurich";

  const contextTypeRaw = sp.contextType?.trim() ?? "";
  const contextIdRaw = sp.contextId?.trim() ?? "";
  const initialContextType = isSupportedTaskContextType(contextTypeRaw as TaskContextType)
    ? (contextTypeRaw as TaskContextType)
    : null;
  const initialContextId =
    initialContextType && contextIdRaw ? contextIdRaw : null;

  const contextualView =
    initialContextType && initialContextId
      ? await loadContextualTaskCreateView(
          ctx,
          initialContextType,
          initialContextId,
          "de-CH",
          timeZone,
        )
      : null;

  const initialTitle = sp.originLabel?.trim() || sp.title?.trim() || "";
  const originMeetingSlug = sp.meetingSlug?.trim() || null;

  return (
    <AufgabenFullCreateClient
      orgUnitOptions={orgUnitOptions}
      timeZone={timeZone}
      backHref={backHref}
      initialContextType={initialContextType}
      initialContextId={initialContextId}
      initialContextLabel={contextualView?.presentation?.title ?? null}
      initialContextSecondary={contextualView?.presentation?.subtitle ?? null}
      initialTitle={initialTitle}
      originMeetingSlug={originMeetingSlug}
    />
  );
}
