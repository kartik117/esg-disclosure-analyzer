import React, { useState } from "react";

interface TabPanelProps {
  tabs: { label: string; content: React.ReactNode }[];
  className?: string;
}

export default function TabPanel({ tabs, className }: TabPanelProps) {
  const [active, setActive] = useState(0);
  return (
    <div className={className}>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active === idx
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
