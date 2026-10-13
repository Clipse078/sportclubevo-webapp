import type { PersonNavEffectiveAccessSection } from "@/lib/admin/users/person-nav-effective-access";
import PersonNavEffectiveAccessView from "@/components/admin/users/PersonNavEffectiveAccessView";

type Props = {
  sections: PersonNavEffectiveAccessSection[];
};

export default function PersonNavEffectiveAccessPanel({ sections }: Props) {
  return (
    <div className="space-y-3" data-testid="person-zugriff-panel">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Effektiver Zugriff</h2>
        <p className="max-w-3xl text-sm text-[var(--text-2)]">
          Effektiver Zugriff ist das Ergebnis aus Rollen, Zuständigkeiten und individuellen
          Anpassungen — gruppiert nach Produktbereich. Klappe Bereiche auf, um Details inklusive
          Herkunft zu prüfen.
        </p>
      </div>
      <PersonNavEffectiveAccessView sections={sections} collapsible />
    </div>
  );
}
