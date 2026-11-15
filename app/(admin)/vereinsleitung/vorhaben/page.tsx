import { redirect } from "next/navigation";
import { legacyVorhabenRedirect } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VereinsentwicklungLegacyPageProps } from "@/lib/club-development/vereinsentwicklung-legacy-search-params";

/** Legacy alias → Vorhaben & Umsetzung (Ansicht Aufgaben). */
export default async function VorhabenAufgabenPage({ searchParams }: VereinsentwicklungLegacyPageProps) {
  const query = (await searchParams) ?? {};
  redirect(legacyVorhabenRedirect(query));
}