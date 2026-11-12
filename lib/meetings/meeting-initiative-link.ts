/**
 * Validates initiative links on meeting agenda items (tenant + visibility).
 */

import { getInitiativeById } from "@/lib/initiatives/queries";
import type { ActorContext } from "@/lib/visibility/actor-context";

export async function resolveMeetingAgendaInitiativeLink(
  actor: ActorContext,
  initiativeId: string | null | undefined,
): Promise<{ initiativeId: string | null; title: string | null; status: string | null; slug: string | null }> {
  if (!initiativeId?.trim()) {
    return { initiativeId: null, title: null, status: null, slug: null };
  }
  const initiative = await getInitiativeById(initiativeId.trim(), actor);
  if (!initiative) {
    throw new Error("Vorhaben nicht gefunden oder nicht sichtbar.");
  }
  return {
    initiativeId: initiative.id,
    title: initiative.title,
    status: initiative.status,
    slug: initiative.slug,
  };
}
