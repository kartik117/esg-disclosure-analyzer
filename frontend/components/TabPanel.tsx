import React, { useState } from "react";

interface TabPanelProps {
  tabs: { label: string; content: React.ReactNode }[];
  className?: string;
}

export default function TabPanel({ tabs, className }: TabPanelProps) {
  const [active, setActive] = useState(0);
  return (
    <div className={className}>
      <div className="flex gap-2 border-b border-slate-200 mb-4">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            className={`px-4 py-2 font-medium ${active === idx ? "border-b-2 border-blue-500 text-blue-700" : "text-slate-600"}`}
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
