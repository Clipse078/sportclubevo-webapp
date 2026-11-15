import { redirect } from "next/navigation";
import { legacySprintsRedirect } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VereinsentwicklungLegacyPageProps } from "@/lib/club-development/vereinsentwicklung-legacy-search-params";

/** Legacy alias → Vorhaben & Umsetzung (Umsetzungsphasen). */
export default async function DevelopmentSprintsPage({ searchParams }: VereinsentwicklungLegacyPageProps) {
  const query = (await searchParams) ?? {};
  redirect(legacySprintsRedirect(query));
}