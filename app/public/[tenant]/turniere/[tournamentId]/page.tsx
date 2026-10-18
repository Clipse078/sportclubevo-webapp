import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicTournamentExperience from "@/components/public/tournament/PublicTournamentExperience";
import {
  loadPublicTournamentViewModel,
  PublicTournamentNotFoundError,
} from "@/lib/tournaments/public/load-public-tournament-view-model.server";
import { getActiveTenantForWebsiteFeed } from "@/lib/tenants/queries";
import { buildPublicTournamentPath } from "@/lib/tournaments/public/build-public-tournament-url";

type Props = {
  params: Promise<{ tenant: string; tournamentId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant: tenantKey, tournamentId } = await params;
  const tenant = await getActiveTenantForWebsiteFeed(tenantKey);
  if (!tenant?.websiteEnabled) {
    return { title: "Turnier" };
  }
  try {
    const model = await loadPublicTournamentViewModel({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      tournamentId,
      timezone: "Europe/Zurich",
      tenantName: tenant.name,
      tenantLogoUrl: null,
    });
    return {
      title: `${model.tournament.title} · ${tenant.name}`,
      description: model.tournament.description ?? `${model.tournament.title} — Spielplan und Ergebnisse`,
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Turnier nicht gefunden", robots: { index: false, follow: false } };
  }
}

export default async function PublicTournamentPage({ params }: Props) {
  const { tenant: tenantKey, tournamentId } = await params;
  const tenant = await getActiveTenantForWebsiteFeed(tenantKey);
  if (!tenant?.websiteEnabled) {
    notFound();
  }

  let model;
  try {
    model = await loadPublicTournamentViewModel({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      tournamentId,
      timezone: "Europe/Zurich",
      tenantName: tenant.name,
      tenantLogoUrl: null,
    });
  } catch (err) {
    if (err instanceof PublicTournamentNotFoundError) notFound();
    throw err;
  }

  const publicPath = buildPublicTournamentPath(tenant.key, tournamentId);
  const siteOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const absolutePublicUrl = siteOrigin ? `${siteOrigin}${publicPath}` : publicPath;

  return (
    <PublicTournamentExperience
      model={model}
      tenantName={tenant.name}
      absolutePublicUrl={absolutePublicUrl}
    />
  );
}
