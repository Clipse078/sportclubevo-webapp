/**
 * Personal dashboard hero image API — SCE-DASHBOARD-V3-03
 *
 * POST   /api/account/dashboard-hero-image  — upload / replace cover image
 * DELETE /api/account/dashboard-hero-image  — remove cover image
 * GET    /api/account/dashboard-hero-image  — storage availability + current URL
 *
 * Auth: any authenticated session with an active tenant context.
 * Storage: Vercel Blob, namespace dashboard-hero/{userId}.{ext}
 *
 * Persistence: User.dashboardHeroImageUrl (proposed field — migration pending).
 * Until migration is approved, blob upload/remove works but URL is not stored in DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUserDashboardHeroImageUrl,
  persistUserDashboardHeroImageUrl,
} from "@/lib/dashboard/dashboard-hero-image";
import {
  removeUserDashboardHeroImage,
  uploadUserDashboardHeroImage,
} from "@/lib/dashboard/dashboard-hero-image-shared";

async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, status: 401 as const, error: "Nicht authentifiziert." };
  }

  if (!session.user.activeTenantId) {
    return { ok: false as const, status: 403 as const, error: "Kein aktiver Mandant." };
  }

  const currentImageUrl = await getUserDashboardHeroImageUrl(session.user.id);

  return {
    ok: true as const,
    session,
    userId: session.user.id,
    currentImageUrl,
  };
}

export async function GET() {
  const check = await requireAuthenticatedUser();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  return NextResponse.json({
    storageAvailable: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    imageUrl: check.currentImageUrl,
    persistencePending: true,
  });
}

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
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
    currentImageUrl: check.currentImageUrl,
    file,
    token,
  });

  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: upload.status });
  }

  const persist = await persistUserDashboardHeroImageUrl(check.userId, upload.imageUrl);

  return NextResponse.json({
    imageUrl: upload.imageUrl,
    persisted: persist.ok && persist.persisted,
    persistencePending: !persist.ok || !persist.persisted,
  });
}

export async function DELETE() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  const check = await requireAuthenticatedUser();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  if (!check.currentImageUrl) {
    return NextResponse.json({ message: "Kein Titelbild vorhanden." });
  }

  const removed = await removeUserDashboardHeroImage({
    userId: check.userId,
    currentImageUrl: check.currentImageUrl,
    token,
  });

  if (!removed.ok) {
    return NextResponse.json({ error: removed.error }, { status: removed.status });
  }

  await persistUserDashboardHeroImageUrl(check.userId, null);

  return NextResponse.json({
    message: "Titelbild entfernt.",
    persisted: removed.persisted,
    persistencePending: !removed.persisted,
  });
}
