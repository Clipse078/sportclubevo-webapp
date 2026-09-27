import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function LegacyTargetGroupDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/dashboard/communication/zielgruppen/${id}`);
}
