import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/integrations/stripe/client";
import { getStripeWebhookSecret } from "@/lib/integrations/stripe/config";
import { processStripeBillingWebhookEvent } from "@/lib/integrations/stripe/stripe-webhook-processor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await processStripeBillingWebhookEvent(event);
    return NextResponse.json({ received: true, result }, { status: 200 });
  } catch (error) {
    console.error("[stripe-webhook] processing failed", {
      eventId: event.id,
      type: event.type,
      error,
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
