import type { PersonNavEffectiveAccessSection } from "@/lib/admin/users/person-nav-effective-access";
import PersonNavEffectiveAccessView from "@/components/admin/users/PersonNavEffectiveAccessView";

type Props = {
  sections: PersonNavEffectiveAccessSection[];
  pendingInvitation?: boolean;
};

export default function PersonNavEffectiveAccessPanel({
  sections,
  pendingInvitation = false,
}: Props) {
  return (
    <div className="space-y-3" data-testid="person-zugriff-panel">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          {pendingInvitation ? "Geplanter Zugriff" : "Effektiver Zugriff"}
        </h2>
        <p className="max-w-3xl text-sm text-[var(--text-2)]">
          {pendingInvitation
            ? "Geplanter Zugriff zeigt die aus den zugewiesenen Rollen und Zuständigkeiten "
              + "abgeleiteten Produktbereiche. Erst nach Annahme der Einladung wird der Zugriff "
              + "produktiv aktiv — bis dahin ist Anmeldung und Navigation weiterhin gesperrt."
            : "Effektiver Zugriff ist das Ergebnis aus Rollen, Zuständigkeiten und individuellen "
              + "Anpassungen — gruppiert nach Produktbereich. Klappe Bereiche auf, um Details "
              + "inklusive Herkunft zu prüfen."}
        </p>
      </div>
      <PersonNavEffectiveAccessView
        sections={sections}
        collapsible
        pendingInvitation={pendingInvitation}
      />
    </div>
  );
}
