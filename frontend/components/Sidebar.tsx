import React from "react";

const navItems = [
  { label: "Dashboard", href: "#dashboard-section", shortLabel: "D" },
  { label: "Claims", href: "#claims-section", shortLabel: "C" },
  { label: "Pages", href: "#pages-section", shortLabel: "P" },
  { label: "AI Assistant", href: "#assistant-section", shortLabel: "AI" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-20 flex-col items-center border-r border-white/60 bg-slate-950 px-3 py-5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_48px_rgba(15,23,42,0.28)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold tracking-[0.18em] text-slate-950">
        ESG
      </div>
      <div className="mt-5 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">
        Workspace
      </div>
      <nav className="mt-5 flex flex-col gap-3">
        {navItems.map((item, index) => (
          <a
            key={item.label}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            className={`group flex h-11 w-11 items-center justify-center rounded-2xl border text-[11px] font-semibold tracking-[0.14em] transition ${
              index === 0
                ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-300"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{item.shortLabel}</span>
          </a>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">
          ESG
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[10px] font-semibold tracking-[0.16em] text-slate-300">
          v1
        </div>
      </div>
    </aside>
  );
}
