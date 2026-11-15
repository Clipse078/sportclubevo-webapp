import { redirect } from "next/navigation";
import { buildVorhabenUndUmsetzungHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { VereinsentwicklungLegacyPageProps } from "@/lib/club-development/vereinsentwicklung-legacy-search-params";

/** Legacy Vorhaben-Liste → Vorhaben & Umsetzung (Ansicht Vorhaben). Detail-URLs bleiben unter /initiativen/[slug]. */
export default async function VereinsleitungInitiativenPage({ searchParams }: VereinsentwicklungLegacyPageProps) {
  const query = (await searchParams) ?? {};
  redirect(
    buildVorhabenUndUmsetzungHref("vorhaben", {
      search: query.search,
      targetId: query.targetId,
      initiativeId: query.initiativeId,
    }),
  );
}