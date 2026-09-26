import Link from "next/link";
import AdminSurfaceCard from "@/components/admin/shared/AdminSurfaceCard";
import { NavDestinationSceIcon } from "@/components/nav/NavDestinationSceIcon";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";

type DashboardModuleCardItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  isVisible: boolean;
};

type DashboardModuleCardsProps = {
  modules: DashboardModuleCardItem[];
};

export default function DashboardModuleCards({
  modules,
}: DashboardModuleCardsProps) {
  const visibleModules = modules.filter((module) => module.isVisible);
  const hiddenModules = modules.filter((module) => !module.isVisible);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <p className="fca-eyebrow">Module</p>
          <h3 className="fca-heading mt-2">Verfügbare Bereiche</h3>
          <p className="fca-body-muted mt-3 max-w-2xl">
            Einstieg in die freigeschalteten FCA WebApp Bereiche mit derselben
            Premium-UX wie auf der Website.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((module) => {
            const sceName = getNavDestinationSceIconName(module.key);
            return (
            <Link
              key={module.key}
              href={module.href}
              className="group block"
            >
              <AdminSurfaceCard className="h-full p-5 transition duration-200 group-hover:-translate-y-[2px] group-hover:shadow-[0_22px_40px_rgba(15,23,42,0.08)]">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-2)] text-[var(--muted)] group-hover:text-[var(--sce-accent)]"
                        aria-hidden
                      >
                        <NavDestinationSceIcon navItemKey={module.key} size={24} />
                      </span>
                      <div className="min-w-0">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Modul
                      </p>
                      <h4 className="mt-3 font-[var(--font-display)] text-[1.35rem] font-bold uppercase leading-[0.96] tracking-[-0.02em] text-slate-900">
                        {module.title}
                      </h4>
                      </div>
                    </div>

                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#0b4aa2]">
                      Live
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {module.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between pt-2">
                    <span className="fca-button-primary">
                      Bereich öffnen
                    </span>

                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 transition group-hover:text-red-600">
                      {sceName ? "SCE" : "FCA"}
                    </span>
                  </div>
                </div>
              </AdminSurfaceCard>
            </Link>
          );
          })}
        </div>
      </section>

      {hiddenModules.length > 0 ? (
        <AdminSurfaceCard className="p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Nicht freigeschaltet
          </p>

          <h3 className="mt-3 font-[var(--font-display)] text-[1.2rem] font-bold uppercase leading-[0.96] tracking-[-0.02em] text-slate-900">
            Versteckte Bereiche für diese Rolle
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Diese Module sind im System vorgesehen, aktuell für den angemeldeten
            Benutzer aber noch nicht freigegeben.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {hiddenModules.map((module) => (
              <span key={module.key} className="fca-pill">
                {module.title}
              </span>
            ))}
          </div>
        </AdminSurfaceCard>
      ) : null}
    </div>
  );
}
