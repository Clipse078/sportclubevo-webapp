"use client";

import { SceIcon } from "../SceIcon";
import {
  SCE_ICON_REGISTRY,
  SCE_ICON_REGISTRY_NAMES,
  type SceIconRegistryName,
} from "../registry";
import type { SceIconSize } from "../SceIcon.types";
import {
  SCE_APPROVED_HERO_ICON_NAMES,
  type SceApprovedHeroIconName,
} from "../masters/approved-hero-meta";

const LIBRARY_SIZES: SceIconSize[] = [16, 20, 24];
const HERO_SIZES: SceIconSize[] = [16, 20, 24, 32, 48];

const HERO_LABELS: Record<SceApprovedHeroIconName, string> = {
  dashboard: "Dashboard",
  "week-planner": "Wochenplaner",
  training: "Training",
  match: "Spiele",
  tournament: "Turniere",
};

function SizeRow({
  name,
  sizes,
  theme,
}: {
  name: SceApprovedHeroIconName;
  sizes: SceIconSize[];
  theme: "original" | "light";
}) {
  const surface =
    theme === "original"
      ? "rounded-lg bg-[#0b1524] px-4 py-3"
      : "sce-theme-light rounded-lg bg-[#f1f5f9] px-4 py-3";

  return (
    <div className={`flex flex-wrap items-center gap-4 ${surface}`}>
      <span className="w-28 shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {theme === "original" ? "SCE Original" : "SCE Light"}
      </span>
      {sizes.map((size) => (
        <div key={size} className="flex flex-col items-center gap-1">
          <SceIcon name={name} size={size} />
          <span className="text-[10px] tabular-nums text-[var(--muted)]">{size}px</span>
        </div>
      ))}
    </div>
  );
}

function HeroIconCard({ name }: { name: SceApprovedHeroIconName }) {
  const meta = SCE_ICON_REGISTRY[name];
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <header className="mb-4 border-b border-[var(--border)] pb-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{HERO_LABELS[name]}</h3>
        <p className="mt-1 font-mono text-xs text-[var(--text-2)]">
          {name} · {meta.viewBox ?? "0 0 24 24"}
        </p>
      </header>
      <div className="space-y-3">
        <SizeRow name={name} sizes={HERO_SIZES} theme="original" />
        <SizeRow name={name} sizes={HERO_SIZES} theme="light" />
      </div>
    </article>
  );
}

function SpecimenRow({ name }: { name: SceIconRegistryName }) {
  const meta = SCE_ICON_REGISTRY[name];
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-3 pr-4 align-middle font-mono text-xs text-[var(--text-2)]">{name}</td>
      <td className="py-3 pr-4 align-middle text-xs text-[var(--muted)]">{meta.category}</td>
      {LIBRARY_SIZES.map((size) => (
        <td key={size} className="py-3 px-3 align-middle text-center">
          <SceIcon name={name} size={size} />
        </td>
      ))}
      <td className="py-3 px-3 align-middle text-center sce-theme-light rounded-md bg-[#f1f5f9]">
        <SceIcon name={name} size={20} />
      </td>
    </tr>
  );
}

export function SceIconSpecimen() {
  return (
    <div className="mx-auto max-w-5xl p-6 text-[var(--foreground)]">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">SCE Icon System — Specimen</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-2)]">
          Internal development surface for SCE-ICONS-01R2. Approved hero masters render from
          committed design artwork; the full 25-icon registry remains below for inventory review.
        </p>
      </header>

      <section className="mb-12 rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold tracking-tight">SCE Hero Icons — Approved Masters</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-2)]">
          Primary visual acceptance surface for Michael. Same 64×64 master geometry at every render
          size; SCE Original and SCE Light differ only by semantic token values.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {SCE_APPROVED_HERO_ICON_NAMES.map((name) => (
            <HeroIconCard key={name} name={name} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Full icon library (25)</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
                <th className="py-2 pr-4 pl-4">Name</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 px-3 text-center">16px</th>
                <th className="py-2 px-3 text-center">20px</th>
                <th className="py-2 px-3 text-center">24px</th>
                <th className="py-2 px-3 text-center">Light 20px</th>
              </tr>
            </thead>
            <tbody>
              {SCE_ICON_REGISTRY_NAMES.map((name) => (
                <SpecimenRow key={name} name={name} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
