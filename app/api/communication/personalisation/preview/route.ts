import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateCommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { previewPersonalisationForRecipient } from "@/lib/communication/personalisation/personalisation-engine";
import { assertPersonalisationPreviewRecipientAuthorized } from "@/lib/communication/personalisation/personalisation-authorization";
import { validatePersonalisationTemplate } from "@/lib/communication/personalisation/personalisation-engine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant fehlt." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject : null;
  const bodyText = typeof body.bodyText === "string" ? body.bodyText : "";
  if (!bodyText.trim()) {
    return NextResponse.json({ error: "Inhalt fehlt." }, { status: 400 });
  }

  const contextRef = body.contextRef as CommunicationContextRef | undefined;
  if (!contextRef) {
    return NextResponse.json({ error: "contextRef fehlt." }, { status: 400 });
  }
  const ctxErr = validateCommunicationContextRef(tenantId, contextRef);
  if (ctxErr) {
    return NextResponse.json({ error: ctxErr }, { status: 400 });
  }

  const audience = body.audience as CommunicationAudienceSpec | undefined;
  const category =
    body.category === "CLUB_OPERATIONAL" ||
    body.category === "CLUB_INFORMATION" ||
    body.category === "TEAM_OPERATIONAL"
      ? body.category
      : "CLUB_INFORMATION";

  const subjectPersonId = String(body.subjectPersonId ?? "").trim();
  const deliveryUserId = body.deliveryUserId ? String(body.deliveryUserId).trim() : null;
  if (!subjectPersonId) {
    return NextResponse.json({ error: "subjectPersonId erforderlich." }, { status: 400 });
  }

  if (audience) {
    const audienceErr = validateCommunicationAudienceSpec(audience);
    if (audienceErr) {
      return NextResponse.json({ error: audienceErr }, { status: 400 });
    }
    try {
      await assertPersonalisationPreviewRecipientAuthorized({
        tenantId,
        senderUserId: session.user.id,
        audience,
        contextRef,
        category,
        subjectPersonId,
        deliveryUserId,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Nicht autorisiert." },
        { status: 403 },
      );
    }
  }

  const validation = validatePersonalisationTemplate({ subject, bodyText, contextRef });

  const preview = await previewPersonalisationForRecipient({
    tenantId,
    contextRef,
    subject,
    bodyText,
    subjectPersonId,
    deliveryUserId: deliveryUserId ?? undefined,
    viaGuardianSubstitution: Boolean(body.viaGuardianSubstitution),
    guardianPersonId: body.guardianPersonId ? String(body.guardianPersonId) : null,
    senderUserId: session.user.id,
    communicationKind: typeof body.communicationKind === "string" ? body.communicationKind : null,
  });

  return NextResponse.json({
    ...preview,
    validation,
  });
}
