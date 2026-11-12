import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getMeetingBySlug, getMeetingSubEntities } from "@/lib/meetings/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import MeetingProtocolPrintView from "@/components/admin/meetings/workspace/MeetingProtocolPrintView";

type Props = { params: Promise<{ slug: string }> };

export default async function MeetingProtocolPrintPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const meeting = await getMeetingBySlug(slug, actor);
  if (!meeting) notFound();

  const subEntities = await getMeetingSubEntities(meeting.id, actor.tenantId);

  return <MeetingProtocolPrintView meeting={meeting} subEntities={subEntities} />;
}
