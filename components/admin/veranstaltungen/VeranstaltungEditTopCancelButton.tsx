"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function VeranstaltungEditTopCancelButton() {
  const router = useRouter();
  const tc = useTranslations("PlanningEditor.common");

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/veranstaltungen")}
      className="fca-button-secondary"
      data-testid="veranstaltung-edit-cancel-top"
    >
      {tc("cancel")}
    </button>
  );
}
