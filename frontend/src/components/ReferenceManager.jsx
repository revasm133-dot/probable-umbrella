import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Trash2, BookOpen, Search } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReferenceManager() {
const fetchReferences = async () => {
  try {
    const res = await axios.get(`${API}/references`);
    setReferences(Array.isArray(res.data) ? res.data : res.data.data ?? []);
  } catch (e) {
    console.error(e);
    setReferences([]);
  }
};
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "", authors: "", year: 2024, journal: "", doi: "", abstract: "", keywords: "", notes: ""
  });

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const res = await axios.get(`${API}/references`);
      setReferences(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const addReference = async () => {
    if (!form.title || !form.authors || !form.journal) return;
    try {
      await axios.post(`${API}/references`, form);
      setForm({ title: "", authors: "", year: 2024, journal: "", doi: "", abstract: "", keywords: "", notes: "" });
      setShowForm(false);
      fetchReferences();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteReference = async (id) => {
    try {
      await axios.delete(`${API}/references/${id}`);
      fetchReferences();
    } catch (e) {
      console.error(e);
    }
  };

 const filtered = (Array.isArray(references) ? references : []).filter(...)
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.authors.toLowerCase().includes(search.toLowerCase()) ||
      r.journal.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="references-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Manajer Referensi
          </h1>
          <p className="text-sm text-[#5C605A] mt-1">{references.length} referensi tersimpan</p>
        </div>
        <button
          data-testid="add-reference-button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] transition-all hover:-translate-y-[1px]"
        >
          <Plus className="w-4 h-4" /> Tambah Referensi
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-[#E2E5DE] p-6 mb-6" data-testid="reference-form">
          <h3 className="text-base font-medium text-[#1C1C19] mb-4">Tambah Referensi Baru</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-[#5C605A]">Judul *</label>
              <input
                data-testid="ref-title-input"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
                placeholder="Judul artikel/jurnal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Penulis *</label>
              <input
                data-testid="ref-authors-input"
                type="text"
                value={form.authors}
                onChange={(e) => setForm({ ...form, authors: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
                placeholder="Nama penulis"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Tahun</label>
              <input
                data-testid="ref-year-input"
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Jurnal *</label>
              <input
                data-testid="ref-journal-input"
                type="text"
                value={form.journal}
                onChange={(e) => setForm({ ...form, journal: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
                placeholder="Nama jurnal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">DOI</label>
              <input
                data-testid="ref-doi-input"
                type="text"
                value={form.doi}
                onChange={(e) => setForm({ ...form, doi: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
                placeholder="10.xxxx/xxxxx"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-[#5C605A]">Abstrak</label>
              <textarea
                data-testid="ref-abstract-input"
                value={form.abstract}
                onChange={(e) => setForm({ ...form, abstract: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46] resize-none"
                placeholder="Ringkasan abstrak"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Kata Kunci</label>
              <input
                data-testid="ref-keywords-input"
                type="text"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
                placeholder="keyword1, keyword2"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Catatan</label>
              <input
                data-testid="ref-notes-input"
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
                placeholder="Catatan pribadi"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              data-testid="save-reference-button"
              onClick={addReference}
              className="px-4 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] transition-colors"
            >
              Simpan
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-md border border-[#E2E5DE] text-sm text-[#5C605A] hover:bg-[#F0F2ED] transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9087]" />
        <input
          data-testid="reference-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari referensi..."
          className="w-full pl-10 pr-4 py-2.5 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
        />
      </div>

      {/* Reference List */}
      <div className="space-y-3" data-testid="references-list">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-[#E2E5DE] mx-auto mb-3" />
            <p className="text-sm text-[#8A9087]">Belum ada referensi. Tambahkan referensi pertama Anda.</p>
          </div>
        ) : (
          filtered.map((ref) => (
            <div
              key={ref.id}
              className="group p-4 rounded-lg border border-[#E2E5DE] bg-white hover:border-[#4A6B46]/20 transition-colors"
              data-testid={`reference-item-${ref.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-[#1C1C19] leading-snug">{ref.title}</h4>
                  <p className="text-xs text-[#5C605A] mt-1">
                    {ref.authors} ({ref.year}). <em>{ref.journal}</em>
                  </p>
                  {ref.doi && (
                    <p className="text-xs text-[#4A6B46] mt-1">DOI: {ref.doi}</p>
                  )}
                  {ref.keywords && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {ref.keywords.split(",").map((kw, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#F0F2ED] text-[#5C605A]">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  data-testid={`delete-ref-${ref.id}`}
                  onClick={() => deleteReference(ref.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[#8A9087] hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
