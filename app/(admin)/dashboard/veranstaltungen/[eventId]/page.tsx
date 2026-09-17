import { redirect } from "next/navigation";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";

type Props = { params: Promise<{ eventId: string }> };

/**
 * Bare `/dashboard/veranstaltungen/[id]` bookmarks and legacy links redirect
 * to the canonical edit surface (tenant scoping enforced on the edit page).
 */
export default async function VeranstaltungDetailRedirectPage({ params }: Props) {
  const { eventId } = await params;
  redirect(getVeranstaltungHref(eventId));
}
