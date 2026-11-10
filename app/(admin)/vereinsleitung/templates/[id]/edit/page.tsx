import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import TemplateForm from "@/components/admin/templates/TemplateForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTemplatePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const template = await prisma.communicationTemplate.findUnique({
    where: { id },
    select: { id: true, title: true, subject: true, bodyMarkdown: true, category: true, moduleKey: true, status: true },
  });
  if (!template) notFound();

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Kommunikation"
        title="Vorlage bearbeiten"
        description={`Bearbeite: ${template.title}`}
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Vorlagen", href: "/vereinsleitung/templates" },
          { label: template.title, href: `/vereinsleitung/templates/${id}` },
          { label: "Bearbeiten" },
        ]}
      >
        <TemplateForm
          mode="edit"
          templateId={id}
          defaultValues={{
            title: template.title,
            subject: template.subject,
            bodyMarkdown: template.bodyMarkdown,
            category: template.category,
            moduleKey: template.moduleKey ?? "",
            status: template.status,
          }}
        />
      </FormPagePattern>
    </PageShell>
  );
}
