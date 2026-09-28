import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveCommunicationAudienceCapabilities } from "@/lib/communication/audience/communication-audience-capabilities";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

export const dynamic = "force-dynamic";

function parseContext(value: string | null, tenantId: string): CommunicationContextRef {
  if (value === "DIRECT") return { kind: "DIRECT", tenantId };
  return { kind: "ORGANISATION", tenantId };
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const tenant = await getActiveTenant();
  if (!tenant || !userId) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const url = new URL(request.url);
  const context = parseContext(url.searchParams.get("context"), tenant.id);

  const capabilities = await resolveCommunicationAudienceCapabilities({
    tenantId: tenant.id,
    userId,
    context,
  });

  return NextResponse.json({ capabilities });
}
