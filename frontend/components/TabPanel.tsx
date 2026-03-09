import React, { useState } from "react";

interface TabPanelProps {
  tabs: { label: string; content: React.ReactNode }[];
  className?: string;
}

export default function TabPanel({ tabs, className }: TabPanelProps) {
  const [active, setActive] = useState(0);
  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active === idx
                ? "border border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border border-slate-300 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/80 hover:text-indigo-700"
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
