import React from "react";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-slate-900 text-white flex flex-col items-center py-6 z-30 shadow-lg">
      {/* Logo */}
      <div className="mb-8 text-xl font-bold">ESG</div>
      {/* Navigation icons */}
      <nav className="flex flex-col gap-6">
        {/* Add nav icons/buttons here */}
      </nav>
    </aside>
  );
}
