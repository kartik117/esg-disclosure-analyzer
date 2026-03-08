import React from "react";

interface TopBarProps {
  reportName?: string;
  onUpload?: () => void;
  onReplace?: () => void;
  onReset?: () => void;
  onExport?: () => void;
}

export default function TopBar({ reportName, onUpload, onReplace, onReset, onExport }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-8 py-4 shadow-sm border-b border-slate-200">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">ESG Disclosure Analyzer</h1>
        {reportName && <span className="ml-4 text-lg text-slate-600">{reportName}</span>}
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={onUpload}>Upload</button>
        <button className="btn" onClick={onReplace}>Replace</button>
        <button className="btn" onClick={onReset}>Reset</button>
        <button className="btn" onClick={onExport}>Export</button>
      </div>
    </header>
  );
}
