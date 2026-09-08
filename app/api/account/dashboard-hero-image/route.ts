export const runtime = "nodejs";

/**
 * Personal dashboard hero image API — SCE-DASHBOARD-V3-03
 *
 * GET    /api/account/dashboard-hero-image  — storage availability + current state
 * POST   /api/account/dashboard-hero-image  — upload / replace cover image
 * PATCH  /api/account/dashboard-hero-image  — persist cover transform
 * DELETE /api/account/dashboard-hero-image  — remove cover image
 *
 * Auth: any authenticated session with an active tenant context.
 * Storage: Vercel Blob, namespace dashboard-hero/{userId}.{ext}
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  clearUserDashboardHero,
  getUserDashboardHeroState,
  updateUserDashboardHeroImage,
  updateUserDashboardHeroTransform,
} from "@/lib/dashboard/dashboard-hero-image";
import {
  removeUserDashboardHeroImage,
  uploadUserDashboardHeroImage,
} from "@/lib/dashboard/dashboard-hero-image-shared";
import { clampPosition } from "@/lib/dashboard/dashboard-hero-position";

async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, status: 401 as const, error: "Nicht authentifiziert." };
  }

  if (!session.user.activeTenantId) {
    return { ok: false as const, status: 403 as const, error: "Kein aktiver Mandant." };
  }

  const heroState = await getUserDashboardHeroState(session.user.id);

  return {
    ok: true as const,
    session,
    userId: session.user.id,
    heroState,
  };
}

function serializeHeroResponse(heroState: Awaited<ReturnType<typeof getUserDashboardHeroState>>) {
  return {
    imageUrl: heroState.imageUrl,
    transform: {
      zoom: heroState.zoom,
      positionX: heroState.positionX,
      positionY: heroState.positionY,
    },
  };
}

export async function GET() {
  const check = await requireAuthenticatedUser();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  return NextResponse.json({
    storageAvailable: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    ...serializeHeroResponse(check.heroState),
  });
}

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Titelbild-Upload ist derzeit nicht verfügbar (Speicher nicht konfiguriert).",
      },
      { status: 503 },
    );
  }

  const check = await requireAuthenticatedUser();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Formulardaten." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Keine Bilddatei übermittelt." }, { status: 400 });
  }

  const upload = await uploadUserDashboardHeroImage({
    userId: check.userId,
    currentImageUrl: check.heroState.imageUrl,
    file,
    token,
  });

  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: upload.status });
  }

  const persist = await updateUserDashboardHeroImage(check.userId, upload.imageUrl);
  if (!persist.ok) {
    return NextResponse.json({ error: persist.error }, { status: 500 });
  }

  return NextResponse.json({
    ...serializeHeroResponse(persist.state),
    persisted: true,
  });
}

export async function PATCH(request: NextRequest) {
  const check = await requireAuthenticatedUser();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfragedaten." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfragedaten." }, { status: 400 });
  }

  const { zoom, positionX, positionY } = body as Record<string, unknown>;

  if (
    typeof zoom !== "number" ||
    typeof positionX !== "number" ||
    typeof positionY !== "number" ||
    !Number.isFinite(zoom) ||
    !Number.isFinite(positionX) ||
    !Number.isFinite(positionY)
  ) {
    return NextResponse.json({ error: "Ungültige Transformationswerte." }, { status: 400 });
  }

  const normalized = clampPosition({ zoom, positionX, positionY });
  const persist = await updateUserDashboardHeroTransform(check.userId, normalized);

  if (!persist.ok) {
    return NextResponse.json({ error: persist.error }, { status: 500 });
  }

  return NextResponse.json({
    transform: {
      zoom: persist.state.zoom,
      positionX: persist.state.positionX,
      positionY: persist.state.positionY,
    },
    persisted: true,
  });
}

export async function DELETE() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  const check = await requireAuthenticatedUser();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  if (!check.heroState.imageUrl) {
    return NextResponse.json({
      message: "Kein Titelbild vorhanden.",
      ...serializeHeroResponse({
        imageUrl: null,
        zoom: check.heroState.zoom,
        positionX: check.heroState.positionX,
        positionY: check.heroState.positionY,
      }),
    });
  }

  const removed = await removeUserDashboardHeroImage({
    userId: check.userId,
    currentImageUrl: check.heroState.imageUrl,
    token,
  });

  if (!removed.ok) {
    return NextResponse.json({ error: removed.error }, { status: removed.status });
  }

  const persist = await clearUserDashboardHero(check.userId);
  if (!persist.ok) {
    return NextResponse.json({ error: persist.error }, { status: 500 });
  }

  return NextResponse.json({
    message: "Titelbild entfernt.",
    ...serializeHeroResponse(persist.state),
    persisted: true,
  });
}
