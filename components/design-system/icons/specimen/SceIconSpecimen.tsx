"use client";

import { SceIcon } from "../SceIcon";
import {
  SCE_ICON_REGISTRY,
  SCE_ICON_REGISTRY_NAMES,
  type SceIconRegistryName,
} from "../registry";
import type { SceIconSize } from "../SceIcon.types";

const SIZES: SceIconSize[] = [16, 20, 24];

function SpecimenRow({ name }: { name: SceIconRegistryName }) {
  const meta = SCE_ICON_REGISTRY[name];
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-3 pr-4 align-middle font-mono text-xs text-[var(--text-2)]">{name}</td>
      <td className="py-3 pr-4 align-middle text-xs text-[var(--muted)]">{meta.category}</td>
      {SIZES.map((size) => (
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
          Internal development surface for SCE-ICONS-01. Same vector geometry under SCE Original
          (default) and SCE Light (last column).
        </p>
      </header>
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
    </div>
  );
}
