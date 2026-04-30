import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Upload, Trash2, Download, FileText, Image, FileSpreadsheet,
  File, FolderOpen, Search, Filter
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { id: "semua", label: "Semua File" },
  { id: "artikel", label: "Artikel/Jurnal" },
  { id: "data", label: "Data Penelitian" },
  { id: "draft", label: "Draft Skripsi" },
  { id: "gambar", label: "Gambar/Foto" },
  { id: "umum", label: "Umum" },
];

function getFileIcon(contentType, filename) {
  if (contentType?.startsWith("image/")) return Image;
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (["csv", "xls", "xlsx"].includes(ext)) return FileSpreadsheet;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return FileText;
  return File;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function FileManager() {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("semua");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("umum");
  const [uploadNotes, setUploadNotes] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, [category]);

  const fetchFiles = async () => {
    try {
      const params = category !== "semua" ? `?category=${category}` : "";
      const res = await axios.get(`${API}/files${params}`);
      setFiles(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const uploadFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    for (const file of fileList) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", uploadCategory);
      formData.append("notes", uploadNotes);

      try {
        await axios.post(`${API}/files/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } catch (e) {
        console.error(`Error uploading ${file.name}:`, e.response?.data?.detail || e.message);
      }
    }

    setUploading(false);
    setUploadNotes("");
    setShowUploadForm(false);
    setSelectedFiles([]);
    fetchFiles();
  };

  const handleFileSelect = (event) => {
    const fileList = Array.from(event.target.files);
    setSelectedFiles(fileList);
    setShowUploadForm(true);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const fileList = Array.from(e.dataTransfer.files);
    setSelectedFiles(fileList);
    setShowUploadForm(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const confirmUpload = () => {
    uploadFiles(selectedFiles);
  };

  const downloadFile = async (file) => {
    try {
      const res = await axios.get(`${API}/files/${file.id}/download`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`${API}/files/${fileId}`);
      fetchFiles();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = files.filter(
    (f) =>
      f.original_name.toLowerCase().includes(search.toLowerCase()) ||
      f.notes.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="files-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Manajer File
          </h1>
          <p className="text-sm text-[#5C605A] mt-1">{files.length} file tersimpan</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            data-testid="file-upload-input"
          />
          <button
            data-testid="upload-file-button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] transition-all hover:-translate-y-[1px]"
          >
            <Upload className="w-4 h-4" /> Unggah File
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUploadForm && selectedFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E2E5DE] p-6 mb-6" data-testid="upload-form">
          <h3 className="text-base font-medium text-[#1C1C19] mb-3">
            Unggah {selectedFiles.length} File
          </h3>
          <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#5C605A]">
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">{f.name}</span>
                <span className="text-xs text-[#8A9087]">({formatSize(f.size)})</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Kategori</label>
              <select
                data-testid="upload-category-select"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
              >
                {CATEGORIES.filter(c => c.id !== "semua").map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#5C605A]">Catatan</label>
              <input
                data-testid="upload-notes-input"
                type="text"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Deskripsi singkat file..."
                className="mt-1 w-full px-3 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              data-testid="confirm-upload-button"
              onClick={confirmUpload}
              disabled={uploading}
              className="px-4 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] disabled:opacity-50 transition-colors"
            >
              {uploading ? "Mengunggah..." : "Unggah"}
            </button>
            <button
              onClick={() => { setShowUploadForm(false); setSelectedFiles([]); }}
              className="px-4 py-2 rounded-md border border-[#E2E5DE] text-sm text-[#5C605A] hover:bg-[#F0F2ED] transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        data-testid="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mb-6 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? "border-[#4A6B46] bg-[#E3EBE1]/50"
            : "border-[#E2E5DE] hover:border-[#4A6B46]/40"
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? "text-[#4A6B46]" : "text-[#8A9087]"}`} />
        <p className="text-sm text-[#5C605A]">
          Seret file ke sini atau{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[#4A6B46] font-medium hover:underline"
          >
            pilih file
          </button>
        </p>
        <p className="text-xs text-[#8A9087] mt-1">Maks. 10MB per file (PDF, DOC, XLS, CSV, gambar, dll.)</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9087]" />
          <input
            data-testid="file-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari file..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-[#E2E5DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46]"
          />
        </div>
        <div className="flex gap-1" data-testid="category-filters">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              data-testid={`filter-${c.id}`}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                category === c.id
                  ? "bg-[#4A6B46] text-white"
                  : "bg-[#F0F2ED] text-[#5C605A] hover:bg-[#E3EBE1]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2" data-testid="files-list">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-[#E2E5DE] mx-auto mb-3" />
            <p className="text-sm text-[#8A9087]">Belum ada file. Unggah file pertama Anda.</p>
          </div>
        ) : (
          filtered.map((file) => {
            const IconComp = getFileIcon(file.content_type, file.original_name);
            const catLabel = CATEGORIES.find(c => c.id === file.category)?.label || file.category;
            return (
              <div
                key={file.id}
                className="group flex items-center gap-4 p-4 rounded-lg border border-[#E2E5DE] bg-white hover:border-[#4A6B46]/20 transition-colors"
                data-testid={`file-item-${file.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#F0F2ED] flex items-center justify-center flex-shrink-0">
                  <IconComp className="w-5 h-5 text-[#4A6B46]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1C1C19] truncate">{file.original_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[#8A9087]">{formatSize(file.size)}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#F0F2ED] text-[#5C605A]">{catLabel}</span>
                    <span className="text-xs text-[#8A9087]">{formatDate(file.uploaded_at)}</span>
                  </div>
                  {file.notes && (
                    <p className="text-xs text-[#8A9087] mt-1 truncate">{file.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    data-testid={`download-file-${file.id}`}
                    onClick={() => downloadFile(file)}
                    className="p-2 rounded text-[#4A6B46] hover:bg-[#E3EBE1] transition-colors"
                    title="Unduh"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    data-testid={`delete-file-${file.id}`}
                    onClick={() => deleteFile(file.id)}
                    className="p-2 rounded text-[#8A9087] hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
