import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { sendTeamPollCommunication } from "@/lib/communication/team/team-poll-communication-service";
import { requireTeamCommunicationSend } from "@/lib/communication/team/team-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { teamId } = await context.params;

  try {
    await requireTeamCommunicationSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
      teamId,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const body = (await request.json()) as {
    kind?: string;
    question?: string;
    description?: string;
    options?: unknown[];
    mode?: string;
    deadlineAt?: string | null;
    resultsVisibility?: string;
    audiencePreset?: string;
  };

  const result = await sendTeamPollCommunication({
    tenantId: tenant.id,
    teamId,
    senderUserId: session.user.id,
    kind: body.kind ?? "POLL",
    question: body.question ?? "",
    description: body.description,
    options: (body.options ?? []) as import("@/lib/communication/team/team-poll-types").PollOptionInput[],
    mode: body.mode,
    deadlineAt: body.deadlineAt,
    resultsVisibility: body.resultsVisibility,
    audiencePreset: body.audiencePreset,
  });

  return NextResponse.json(result);
}
