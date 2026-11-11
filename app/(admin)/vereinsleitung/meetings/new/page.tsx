import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MeetingForm from "@/components/admin/meetings/MeetingForm";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewMeetingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Meetings"
        title="Neues Meeting erstellen"
        description="Meeting erfassen mit Datum, Ort und Sichtbarkeitseinstellungen."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Meetings", href: "/vereinsleitung/meetings" },
          { label: "Neues Meeting" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <MeetingForm mode="create" layout="composer" />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
