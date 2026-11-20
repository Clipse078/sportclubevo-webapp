"use client";

export default function UmsetzungsplanungInsertionLine({ active }: { active: boolean }) {
  return (
    <div className="relative mx-1 h-2 flex items-center pointer-events-none select-none" aria-hidden>
      <div
        className={[
          "absolute inset-x-0 h-[2px] rounded-full transition-all duration-100 origin-center",
          active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-95",
        ].join(" ")}
        style={{ background: "var(--sce-primary)" }}
      />
    </div>
  );
}