import React from "react";

const navItems = [
  { label: "Dashboard", href: "#dashboard-section", shortLabel: "D" },
  { label: "Claims", href: "#claims-section", shortLabel: "C" },
  { label: "Pages", href: "#pages-section", shortLabel: "P" },
  { label: "AI Assistant", href: "#assistant-section", shortLabel: "AI" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-20 flex-col items-center border-r border-slate-200/80 bg-white/72 px-3 py-5 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_rgba(99,102,241,0.08)] backdrop-blur-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#0ea5e9)] text-sm font-semibold tracking-[0.18em] text-white shadow-sm">
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
                ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                : "border-slate-200 bg-white/80 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-indigo-600"
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-[10px] font-semibold tracking-[0.16em] text-slate-600">
          v1
        </div>
      </div>
    </aside>
  );
}
