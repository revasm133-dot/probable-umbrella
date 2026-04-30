import React from "react";
import {
  LayoutDashboard,
  MessageCircle,
  Calculator,
  PenTool,
  BookOpen,
  Database,
  Leaf
} from "lucide-react";

const menuItems = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "chat", label: "Dosen Pembimbing AI", icon: MessageCircle },
  { id: "statistics", label: "Kalkulator Statistik", icon: Calculator },
  { id: "writing", label: "Editor Penulisan", icon: PenTool },
  { id: "references", label: "Manajer Referensi", icon: BookOpen },
  { id: "data", label: "Data Penelitian", icon: Database },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside
      className="w-64 h-screen flex-shrink-0 border-r border-[#E2E5DE] bg-[#EFF1EB] flex flex-col"
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="p-6 border-b border-[#E2E5DE]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#4A6B46] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#1C1C19]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              SkripsiAI
            </h1>
            <p className="text-[10px] tracking-[0.15em] uppercase text-[#8A9087]">
              Asisten Penelitian
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1" data-testid="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => setActivePage(item.id)}
              className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left ${
                isActive
                  ? "active bg-[#E3EBE1] text-[#1C1C19] font-medium"
                  : "text-[#5C605A] hover:text-[#1C1C19]"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? "text-[#4A6B46]" : ""}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#E2E5DE]">
        <div className="px-3 py-2 rounded-md bg-[#E3EBE1]/60">
          <p className="text-xs text-[#5C605A] font-medium">Skripsi S1 Nutrisi</p>
          <p className="text-[10px] text-[#8A9087] mt-0.5 leading-tight">
            Bubur Instan Pegagan
          </p>
        </div>
      </div>
    </aside>
  );
}
