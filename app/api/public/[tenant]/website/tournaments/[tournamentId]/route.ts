/**
 * GET /api/public/[tenant]/website/tournaments/[tournamentId]
 *
 * Public read-only tournament detail (schedule, results, standings) for
 * website-visible, approved tournaments. Fail-closed — unpublished tournaments
 * return 404.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  buildWebsiteEnvelope,
  resolveTenantFromParams,
  assertWebsiteEnabled,
} from "@/lib/website/response-helpers";
import {
  loadPublicTournamentViewModel,
  PublicTournamentNotFoundError,
} from "@/lib/tournaments/public/load-public-tournament-view-model.server";
import { buildPublicCacheTag, PUBLIC_CACHE_DOMAINS } from "@/lib/website/public-cache-tags";

type RouteParams = { params: Promise<{ tenant: string; tournamentId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenant: tenantSlug, tournamentId } = await params;

    const tenant = await resolveTenantFromParams(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const guard = assertWebsiteEnabled(tenant);
    if (guard) return guard;

    const viewModel = await loadPublicTournamentViewModel({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      tournamentId,
      timezone: "Europe/Zurich",
      tenantName: tenant.name,
      tenantLogoUrl: null,
    });

    const response = NextResponse.json(
      buildWebsiteEnvelope(tenant, { tournament: viewModel }, { tournamentId }),
    );
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );
    response.headers.set(
      "X-SCE-Cache-Tag",
      buildPublicCacheTag(tenant.key, PUBLIC_CACHE_DOMAINS.TOURNAMENTS),
    );
    return response;
  } catch (error) {
    if (error instanceof PublicTournamentNotFoundError) {
      return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 });
    }
    console.error("[public/[tenant]/website/tournaments/[tournamentId]] GET failed:", error);
    return NextResponse.json(
      { error: "Ein technischer Fehler ist aufgetreten. Bitte versuche es später erneut." },
      { status: 500 },
    );
  }
}
