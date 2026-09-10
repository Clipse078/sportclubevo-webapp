import { prisma } from "@/lib/db/prisma";

export async function claimStripeWebhookEvent(input: {
  stripeEventId: string;
  eventType: string;
}): Promise<"claimed" | "duplicate"> {
  try {
    await prisma.stripeWebhookProcessedEvent.create({
      data: {
        stripeEventId: input.stripeEventId,
        eventType: input.eventType,
      },
    });
    return "claimed";
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      return "duplicate";
    }
    throw error;
  }
}
