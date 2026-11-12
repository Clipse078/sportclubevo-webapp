import { auth } from "@/auth";
import { redirect } from "next/navigation";
import InitiativeForm from "@/components/admin/initiatives/InitiativeForm";
import { ClubDevelopmentFormWorkflowShell } from "@/components/sce/club-development/ClubDevelopmentFormWorkflowShell";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewInitiativePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Initiativen"
        title="Neue Initiative erstellen"
        description="Initiative mit Verantwortlichen, Status, optionaler Freigabe und Sichtbarkeit erfassen."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Initiativen", href: "/vereinsleitung/initiativen" },
          { label: "Neue Initiative" },
        ]}
      >
        <ClubDevelopmentFormWorkflowShell>
          <InitiativeForm mode="create" layout="composer" />
        </ClubDevelopmentFormWorkflowShell>
      </FormPagePattern>
    </PageShell>
  );
}
