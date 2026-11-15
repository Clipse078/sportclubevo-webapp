import { redirect } from "next/navigation";
import { legacyBacklogRedirect } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VereinsentwicklungLegacyPageProps } from "@/lib/club-development/vereinsentwicklung-legacy-search-params";

/** Legacy alias → Vorhaben & Umsetzung (Prioritäten). */
export default async function InitiativeBacklogPage({ searchParams }: VereinsentwicklungLegacyPageProps) {
  const query = (await searchParams) ?? {};
  redirect(legacyBacklogRedirect(query));
}