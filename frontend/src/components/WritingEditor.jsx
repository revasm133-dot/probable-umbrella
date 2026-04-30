import React, { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { PenTool, Copy, RefreshCw, FileText } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MODES = [
  { id: "paraphrase", label: "Parafrase", desc: "Ubah kalimat tanpa mengubah makna" },
  { id: "formal", label: "Formalkan", desc: "Jadikan gaya akademik formal" },
  { id: "review", label: "Review", desc: "Berikan saran perbaikan" },
  { id: "suggest", label: "Kembangkan", desc: "Lanjutkan/kembangkan paragraf" },
];

export default function WritingEditor() {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [mode, setMode] = useState("formal");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const processText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await axios.post(`${API}/writing/assist`, { text, mode, context });
      setResult(res.data.result);
    } catch (e) {
      setResult("Maaf, terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API}/templates`);
      setTemplates(res.data);
      setShowTemplates(true);
    } catch (e) {
      console.error(e);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="writing-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Editor Penulisan Akademik
          </h1>
          <p className="text-sm text-[#5C605A] mt-1">Bantu penulisan skripsi dalam Bahasa Indonesia formal</p>
        </div>
        <button
          data-testid="templates-button"
          onClick={loadTemplates}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#E2E5DE] text-sm text-[#5C605A] hover:bg-[#F0F2ED] transition-colors"
        >
          <FileText className="w-4 h-4" /> Template
        </button>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="mb-6 bg-white rounded-lg border border-[#E2E5DE] p-6" data-testid="templates-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[#1C1C19]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Template Penulisan Skripsi
            </h3>
            <button onClick={() => setShowTemplates(false)} className="text-sm text-[#8A9087] hover:text-[#1C1C19]">
              Tutup
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="p-4 rounded-md border border-[#E2E5DE] hover:border-[#4A6B46]/30 transition-colors">
                <h4 className="text-sm font-medium text-[#1C1C19] mb-1">{tpl.title}</h4>
                <p className="text-xs text-[#8A9087] mb-2">{tpl.description}</p>
                <ul className="space-y-0.5">
                  {tpl.structure.map((item, i) => (
                    <li key={i} className="text-xs text-[#5C605A]">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4" data-testid="writing-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            data-testid={`mode-${m.id}`}
            onClick={() => setMode(m.id)}
            className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
              mode === m.id
                ? "bg-[#4A6B46] text-white"
                : "bg-[#F0F2ED] text-[#5C605A] hover:bg-[#E3EBE1]"
            }`}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-[#5C605A] uppercase tracking-wide">Teks Input</label>
          <textarea
            data-testid="writing-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Masukkan teks yang ingin diproses..."
            rows={12}
            className="w-full p-4 rounded-lg border border-[#E2E5DE] text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46] resize-none paper-editor"
          />
          <textarea
            data-testid="writing-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Konteks tambahan (opsional)..."
            rows={2}
            className="w-full p-3 rounded-lg border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46] resize-none"
          />
          <button
            data-testid="process-writing-button"
            onClick={processText}
            disabled={!text.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] disabled:opacity-50 transition-all hover:-translate-y-[1px]"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            {loading ? "Memproses..." : "Proses"}
          </button>
        </div>

        {/* Output */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#5C605A] uppercase tracking-wide">Hasil</label>
            {result && (
              <button
                data-testid="copy-result-button"
                onClick={copyResult}
                className="flex items-center gap-1 text-xs text-[#4A6B46] hover:text-[#3C5739]"
              >
                <Copy className="w-3 h-3" /> Salin
              </button>
            )}
          </div>
          <div className="w-full min-h-[320px] p-4 rounded-lg border border-[#E2E5DE] bg-white paper-editor" data-testid="writing-result">
            {result ? (
              <div className="markdown-content text-sm leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-[#8A9087] italic">Hasil akan muncul di sini...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
