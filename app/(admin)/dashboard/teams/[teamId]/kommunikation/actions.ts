"use server";

import { revalidatePath } from "next/cache";
import {
  archiveTeamCommunication,
  createTeamCommunicationDraft,
  publishTeamCommunication,
} from "@/lib/communication/team/team-communication-service";
import { requireTeamCommunicationSendAccess } from "@/lib/communication/team/require-team-communication-access";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type ActionResult = { ok: true } | { ok: false; message: string };

export async function createTeamMessageDraftAction(
  teamId: string,
  formData: FormData,
): Promise<ActionResult & { communicationId?: string }> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    const bodyText = String(formData.get("bodyText") ?? "");
    const created = await createTeamCommunicationDraft({
      tenantId: access.tenantId,
      teamId,
      senderUserId: access.userId,
      bodyText,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true, communicationId: created.id };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung zum Senden." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erstellen fehlgeschlagen.",
    };
  }
}

export async function publishTeamMessageAction(
  teamId: string,
  communicationId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await publishTeamCommunication({
      tenantId: access.tenantId,
      teamId,
      communicationId,
      senderUserId: access.userId,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return { ok: false, message: "Keine Berechtigung zum Senden." };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Veröffentlichen fehlgeschlagen.",
    };
  }
}

export async function archiveTeamMessageAction(
  teamId: string,
  communicationId: string,
): Promise<ActionResult> {
  try {
    const access = await requireTeamCommunicationSendAccess(teamId);
    await archiveTeamCommunication({
      tenantId: access.tenantId,
      communicationId,
      actorUserId: access.userId,
    });
    revalidatePath(`/dashboard/teams/${teamId}/kommunikation`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Archivieren fehlgeschlagen.",
    };
  }
}
