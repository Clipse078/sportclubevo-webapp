import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { loadSportingActivityDetail } from "@/lib/sporting-activity-detail/load-sporting-activity-detail";
import { SportingActivityDetailPageView } from "@/components/sporting-activity/detail/SportingActivityDetailPageView";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function TrainingSessionActivityDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const tenant = await getActiveTenant();
  if (!tenant?.id) {
    notFound();
  }

  const { sessionId } = await params;
  const { platform, tenant: tenantPerms } = await getRequestEffectivePermissions(
    session.user.id,
    tenant.id,
  );
  const permissionKeys = [...platform, ...tenantPerms] as PermissionKey[];

  const result = await loadSportingActivityDetail({
    tenantId: tenant.id,
    userId: session.user.id,
    permissionKeys,
    ref: { kind: "training-session", sessionId },
  });

  if (!result.ok) {
    notFound();
  }

  const fmtCfg = { locale: tenant.locale ?? "de-CH", timezone: tenant.timezone ?? "Europe/Zurich" };

  return (
    <SportingActivityDetailPageView
      detail={result.detail}
      fmtCfg={fmtCfg}
      backHref="/dashboard"
    />
  );
}
