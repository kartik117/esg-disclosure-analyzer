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
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-6 py-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-sm sm:flex">
            ESG
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
              ESG Disclosure Analyzer
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">
              Analytics workspace for disclosure review
            </p>
          </div>
        </div>
        {reportName && (
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 lg:inline-flex">
            {reportName}
          </span>
        )}
        <div className="flex gap-2">
          {onUpload && (
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={onUpload}>Upload</button>
          )}
          {onReplace && (
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={onReplace}>Replace</button>
          )}
          {onReset && (
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" onClick={onReset}>Reset</button>
          )}
          {onExport && (
            <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800" onClick={onExport}>Export</button>
          )}
        </div>
      </div>
    </header>
  );
}
