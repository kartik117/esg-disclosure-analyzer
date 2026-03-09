import React, { useState } from "react";

interface TabPanelProps {
  tabs: { label: string; content: React.ReactNode }[];
  className?: string;
}

export default function TabPanel({ tabs, className }: TabPanelProps) {
  const [active, setActive] = useState(0);
  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800/90 pb-3">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active === idx
                ? "border border-sky-500/40 bg-sky-500/12 text-sky-100 shadow-sm"
                : "border border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-900 hover:text-slate-100"
            }`}
            onClick={() => setActive(idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}
