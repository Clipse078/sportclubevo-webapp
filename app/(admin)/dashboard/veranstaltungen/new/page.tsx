import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ToastProvider } from "@/components/ui/ToastProvider";
import PlanningEditorShell from "@/components/admin/shared/planning-editor/PlanningEditorShell";
import PlanningEditorHeader from "@/components/admin/shared/planning-editor/PlanningEditorHeader";
import VeranstaltungCreateForm from "@/components/admin/veranstaltungen/VeranstaltungCreateForm";
import { getTranslations } from "next-intl/server";

export default async function NewVeranstaltungPage() {
  await requirePermission(PERMISSIONS.EVENTS_MANAGE);
  const t = await getTranslations("Veranstaltungen.editor.create");

  return (
    <ToastProvider>
      <PlanningEditorShell testId="veranstaltung-create-page">
        <PlanningEditorHeader
          backHref="/dashboard/veranstaltungen"
          backLabel={t("backNav")}
          title={t("title")}
          scheduleContext={t("description")}
          backLinkTestId="veranstaltung-create-back-link"
          testId="veranstaltung-create-header"
        />
        <p className="text-xs leading-snug text-[var(--text-2)]" data-testid="veranstaltung-create-intro">
          {t("intro")}
        </p>
        <VeranstaltungCreateForm />
      </PlanningEditorShell>
    </ToastProvider>
  );
}
