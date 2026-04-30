import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MessageCircle,
  Calculator,
  PenTool,
  BookOpen,
  Database,
  ArrowRight,
  FlaskConical
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ references: 0, sessions: 0, dataPoints: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [refs, sessions, data] = await Promise.all([
          axios.get(`${API}/references`),
          axios.get(`${API}/chat/sessions`),
          axios.get(`${API}/research-data`)
        ]);
        setStats({
          references: refs.data.length,
          sessions: sessions.data.length,
          dataPoints: data.data.length
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  const quickActions = [
    { id: "chat", label: "Konsultasi AI", desc: "Tanya dosen pembimbing AI", icon: MessageCircle, color: "#4A6B46" },
    { id: "statistics", label: "Hitung Statistik", desc: "ANOVA & DMRT", icon: Calculator, color: "#4A6E8C" },
    { id: "writing", label: "Tulis Skripsi", desc: "Editor penulisan akademik", icon: PenTool, color: "#D4A373" },
    { id: "references", label: "Kelola Referensi", desc: "Bibliografi & sitasi", icon: BookOpen, color: "#C48A31" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Selamat Datang, Reva
        </h1>
        <p className="text-[#5C605A] mt-2 text-base">
          Asisten penelitian skripsi Anda siap membantu.
        </p>
      </div>

      {/* Research Context Card */}
      <div className="mb-8 p-6 rounded-lg border border-[#E2E5DE] bg-white" data-testid="research-context-card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#E3EBE1] flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-[#4A6B46]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#1C1C19] mb-1">Penelitian Aktif</h3>
            <p className="text-sm text-[#5C605A] leading-relaxed">
              Analisis Fisikokimia Bubur Instan yang Difortifikasi dengan Daun Pegagan 
              (<em>Centella asiatica</em>) sebagai Pangan Darurat Bencana
            </p>
            <div className="flex gap-4 mt-3">
              <span className="text-xs px-2 py-1 rounded bg-[#E3EBE1] text-[#4A6B46] font-medium">F1: 5%</span>
              <span className="text-xs px-2 py-1 rounded bg-[#E3EBE1] text-[#4A6B46] font-medium">F2: 10%</span>
              <span className="text-xs px-2 py-1 rounded bg-[#E3EBE1] text-[#4A6B46] font-medium">F3: 15%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8" data-testid="dashboard-stats">
        <div className="p-4 rounded-lg border border-[#E2E5DE] bg-white">
          <p className="text-2xl font-semibold text-[#1C1C19]">{stats.references}</p>
          <p className="text-xs text-[#8A9087] mt-1">Referensi Tersimpan</p>
        </div>
        <div className="p-4 rounded-lg border border-[#E2E5DE] bg-white">
          <p className="text-2xl font-semibold text-[#1C1C19]">{stats.sessions}</p>
          <p className="text-xs text-[#8A9087] mt-1">Sesi Konsultasi</p>
        </div>
        <div className="p-4 rounded-lg border border-[#E2E5DE] bg-white">
          <p className="text-2xl font-semibold text-[#1C1C19]">{stats.dataPoints}</p>
          <p className="text-xs text-[#8A9087] mt-1">Data Penelitian</p>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-medium text-[#1C1C19] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
        Aksi Cepat
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="quick-actions">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              data-testid={`quick-action-${action.id}`}
              onClick={() => onNavigate(action.id)}
              className="group flex items-center gap-4 p-5 rounded-lg border border-[#E2E5DE] bg-white hover:border-[#4A6B46]/30 hover:-translate-y-[1px] hover:shadow-md transition-all duration-200 text-left"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: action.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#1C1C19]">{action.label}</p>
                <p className="text-xs text-[#8A9087] mt-0.5">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8A9087] group-hover:text-[#4A6B46] group-hover:translate-x-1 transition-all" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
