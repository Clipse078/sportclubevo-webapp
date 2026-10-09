"use client";

import { useTranslations } from "next-intl";
import { VERANSTALTUNG_EDIT_FORM_ID } from "@/components/admin/veranstaltungen/veranstaltung-edit-form-id";
import { useVeranstaltungEditSubmitState } from "@/components/admin/veranstaltungen/VeranstaltungEditSubmitContext";

type Props = {
  disabled?: boolean;
};

export default function VeranstaltungEditTopSaveButton({ disabled = false }: Props) {
  const t = useTranslations("Veranstaltungen.editor.edit");
  const { submitting } = useVeranstaltungEditSubmitState();

  return (
    <button
      type="submit"
      form={VERANSTALTUNG_EDIT_FORM_ID}
      disabled={disabled || submitting}
      className="fca-button-primary"
      data-testid="veranstaltung-edit-save-top"
    >
      {submitting ? t("saving") : t("save")}
    </button>
  );
}
