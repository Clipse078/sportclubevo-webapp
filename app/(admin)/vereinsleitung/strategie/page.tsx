import { redirect } from "next/navigation";
import { legacyStrategieListRedirect } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VereinsentwicklungLegacyPageProps } from "@/lib/club-development/vereinsentwicklung-legacy-search-params";

/** Legacy alias → Strategie & Ziele workspace (Ansicht Strategie). */
export default async function VereinsleitungStrategiePage({ searchParams }: VereinsentwicklungLegacyPageProps) {
  const query = (await searchParams) ?? {};
  redirect(legacyStrategieListRedirect(query));
}