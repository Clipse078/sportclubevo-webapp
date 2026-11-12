import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MeetingForm from "@/components/admin/meetings/MeetingForm";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { getVereinsleitungMeetingCreateDefaults } from "@/lib/meetings/meeting-create-defaults";

export default async function NewMeetingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.activeTenantId;
  const defaults = tenantId ? await getVereinsleitungMeetingCreateDefaults(tenantId) : null;

  const visibilityHint =
    defaults?.vereinsleitungOrgUnitLabel != null
      ? `Standard: eingeschränkt auf «${defaults.vereinsleitungOrgUnitLabel}». Sie können die Sichtbarkeit in den erweiterten Einstellungen anpassen.`
      : "Standard: eingeschränkt. Bitte mindestens eine Org.-Einheit, Rolle oder Person für die Sichtbarkeit wählen.";

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Sitzungen"
        title="Neue Sitzung erstellen"
        description="Termin, Ort, Teilnehmer und Sichtbarkeit für die Vereinsleitung erfassen."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Sitzungen", href: "/vereinsleitung/meetings" },
          { label: "Neue Sitzung" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <MeetingForm
            mode="create"
            layout="page"
            defaultValues={{
              visibilityScope: defaults?.visibilityScope ?? "RESTRICTED",
              visibleOrgUnitRefs: defaults?.visibleOrgUnitRefs ?? [],
              visibilityHint,
            }}
          />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
