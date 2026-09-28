import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERSONAL_SIGNATURE_ROUTE_PERMISSIONS } from "@/lib/communication/personal-signature/route-access";
import { uploadPersonalSignatureImage } from "@/lib/communication/personal-signature/personal-signature-image-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  await requireAnyPermission(PERSONAL_SIGNATURE_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const userId = session?.user?.id;
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("file");
  if (files.length !== 1 || !(files[0] instanceof File)) {
    return NextResponse.json({ error: "Bitte genau eine Bilddatei auswählen." }, { status: 400 });
  }
  const file = files[0];
  const buffer = new Uint8Array(await file.arrayBuffer());

  const result = await uploadPersonalSignatureImage({
    tenantId: tenant.id,
    userId,
    filename: file.name,
    declaredContentType: file.type,
    buffer,
  });

  if (!result.ok) {
    const status =
      result.code === "FORBIDDEN"
        ? 403
        : result.code === "FILE_TOO_LARGE"
          ? 413
          : 400;
    return NextResponse.json({ error: result.code, message: result.message }, { status });
  }

  return NextResponse.json({
    attachmentId: result.attachmentId,
    cidKey: result.cidKey,
    contentType: result.contentType,
    sizeBytes: result.sizeBytes,
    filename: result.filename,
  });
}
