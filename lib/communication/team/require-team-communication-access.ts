import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  requireTeamCommunicationSend,
  requireTeamCommunicationView,
  type TeamCommunicationAuthorization,
} from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

export type TeamCommunicationPageAccess = TeamCommunicationAuthorization & {
  tenantKey: string;
};

export async function requireTeamCommunicationPageAccess(
  teamId: string,
): Promise<TeamCommunicationPageAccess> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  try {
    const authz = await requireTeamCommunicationView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
      teamId,
    });
    return { ...authz, tenantKey: tenant.key };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) notFound();
    throw error;
  }
}

export async function requireTeamCommunicationSendAccess(
  teamId: string,
): Promise<TeamCommunicationPageAccess> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  try {
    const authz = await requireTeamCommunicationSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
      teamId,
    });
    return { ...authz, tenantKey: tenant.key };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) notFound();
    throw error;
  }
}
