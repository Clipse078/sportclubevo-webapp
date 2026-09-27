import { redirect } from "next/navigation";

export default function LegacyNewTargetGroupRedirect() {
  redirect("/dashboard/communication/zielgruppen/new");
}
