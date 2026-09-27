import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/push/push-provider";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const publicKey = getWebPushPublicKey();
  if (!publicKey) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({ enabled: true, publicKey });
}
