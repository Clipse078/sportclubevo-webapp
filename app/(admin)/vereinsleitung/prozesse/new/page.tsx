import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProcessForm from "@/components/admin/club-development/ProcessForm";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewProcessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Club Entwicklung"
        title="Neuen Prozess erstellen"
        description="Prozess mit Verantwortlichen, Status, optionaler Freigabe und Sichtbarkeit erfassen."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Prozesse", href: "/vereinsleitung/prozesse" },
          { label: "Neuer Prozess" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <ProcessForm mode="create" />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
