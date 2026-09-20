import { PageHeader, PageShell } from "@/components/ui/page";
import NotificationCenterClient from "@/components/admin/notifications/NotificationCenterClient";
import { listNotificationsForUser } from "@/lib/notifications/read-service";
import { getNotificationRecipientContext } from "@/lib/notifications/server-context";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = { view?: string; page?: string };

type Props = { searchParams?: Promise<SearchParams> };

export default async function NotificationsPage({ searchParams }: Props) {
  const ctx = await getNotificationRecipientContext();
  if (!ctx) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const filter = params.view === "unread" ? "UNREAD" : "ALL";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const { items, totalCount, pageCount } = await listNotificationsForUser({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    filter,
    page,
  });

  return (
    <PageShell>
      <PageHeader
        title="Benachrichtigungen"
        description="Was Aufmerksamkeit braucht — mit direkten Links zur jeweiligen Arbeitsfläche."
      />
      <NotificationCenterClient
        items={items}
        filter={filter}
        page={page}
        pageCount={pageCount}
        totalCount={totalCount}
      />
    </PageShell>
  );
}
