import React, { useState } from "react";

interface AccordionPanelProps {
  sections: { label: string; content: React.ReactNode }[];
}

export default function AccordionPanel({ sections }: AccordionPanelProps) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="mt-4">
      {sections.map((section, idx) => (
        <div key={section.label} className="mb-2">
          <button
            className="w-full text-left px-4 py-2 font-medium bg-slate-100 rounded"
            onClick={() => setOpen(open === idx ? null : idx)}
          >
            {section.label}
          </button>
          {open === idx && (
            <div className="px-4 py-2 border border-slate-200 rounded-b bg-white">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
