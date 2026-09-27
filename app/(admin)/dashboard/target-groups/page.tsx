import { redirect } from "next/navigation";

export default function LegacyTargetGroupsRedirect() {
  redirect("/dashboard/communication/zielgruppen");
}
