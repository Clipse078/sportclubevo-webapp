import { redirect } from "next/navigation";
import { legacyTargetsListRedirect } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VereinsentwicklungLegacyPageProps } from "@/lib/club-development/vereinsentwicklung-legacy-search-params";

/** Legacy alias → Strategie & Ziele workspace (Ansicht Alle Ziele). */
export default async function TargetsPage({ searchParams }: VereinsentwicklungLegacyPageProps) {
  const query = (await searchParams) ?? {};
  redirect(legacyTargetsListRedirect(query));
}