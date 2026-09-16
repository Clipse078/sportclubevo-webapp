import { redirect } from "next/navigation";

/**
 * PLANNING-HUB-01 — Planung defaults to the Wochenplaner command center.
 */
export default function PlannerRedirectPage() {
  redirect("/dashboard/planner/week");
}
