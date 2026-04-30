import React, { useState, useEffect } from "react";
import axios from "axios";
import { CheckCircle2, Circle, Clock, Edit3, RotateCcw, ChevronDown, ChevronRight, FileText } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  belum_mulai: { label: "Belum Mulai", color: "#8A9087", bg: "#F0F2ED", icon: Circle },
  sedang_dikerjakan: { label: "Sedang Dikerjakan", color: "#4A6B46", bg: "#E3EBE1", icon: Clock },
  revisi: { label: "Revisi", color: "#C48A31", bg: "#F8ECD9", icon: RotateCcw },
  selesai: { label: "Selesai", color: "#3A7D44", bg: "#E3EBE1", icon: CheckCircle2 },
};

export default function ProgressTracker() {
  const [chapters, setChapters] = useState([]);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await axios.get(`${API}/progress`);
      if (res.data.length === 0) {
        await axios.post(`${API}/progress/seed`);
        const seeded = await axios.get(`${API}/progress`);
        setChapters(seeded.data);
      } else {
        setChapters(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateChapter = async (chapterId, updates) => {
    try {
      await axios.put(`${API}/progress/${chapterId}`, updates);
      fetchProgress();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSubtask = async (chapter, subtaskIndex) => {
    const updatedSubtasks = [...chapter.subtasks];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      completed: !updatedSubtasks[subtaskIndex].completed,
    };
    await updateChapter(chapter.id, { subtasks: updatedSubtasks });
  };

  const changeStatus = async (chapter, newStatus) => {
    await updateChapter(chapter.id, { status: newStatus });
  };

  const updatePages = async (chapter, pages) => {
    await updateChapter(chapter.id, { current_pages: parseInt(pages) || 0 });
  };

  const getOverallProgress = () => {
    if (chapters.length === 0) return 0;
    const totalSubtasks = chapters.reduce((sum, ch) => sum + ch.subtasks.length, 0);
    const completedSubtasks = chapters.reduce(
      (sum, ch) => sum + ch.subtasks.filter((s) => s.completed).length, 0
    );
    return totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  };

  const getChapterProgress = (chapter) => {
    if (chapter.subtasks.length === 0) return 0;
    const completed = chapter.subtasks.filter((s) => s.completed).length;
    return Math.round((completed / chapter.subtasks.length) * 100);
  };

  const getTotalPages = () => {
    return {
      current: chapters.reduce((sum, ch) => sum + (ch.current_pages || 0), 0),
      target: chapters.reduce((sum, ch) => sum + (ch.target_pages || 0), 0),
    };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-sm text-[#8A9087]">Memuat data progres...</p>
      </div>
    );
  }

  const overall = getOverallProgress();
  const pages = getTotalPages();

  return (
    <div className="p-8 max-w-5xl mx-auto" data-testid="progress-page">
      <div className="mb-6">
        <h1 className="text-3xl font-medium text-[#1C1C19] tracking-tight" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Progress Skripsi
        </h1>
        <p className="text-sm text-[#5C605A] mt-1">Pantau kemajuan penulisan setiap bab</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-lg border border-[#E2E5DE] p-6 mb-6" data-testid="overall-progress">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium text-[#1C1C19]">Progres Keseluruhan</h3>
          <span className="text-2xl font-semibold text-[#4A6B46]">{overall}%</span>
        </div>
        <div className="w-full h-3 bg-[#F0F2ED] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4A6B46] rounded-full transition-all duration-500"
            style={{ width: `${overall}%` }}
            data-testid="overall-progress-bar"
          />
        </div>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#8A9087]" />
            <span className="text-sm text-[#5C605A]">
              {pages.current} / {pages.target} halaman
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3A7D44]" />
            <span className="text-sm text-[#5C605A]">
              {chapters.filter((ch) => ch.status === "selesai").length} / {chapters.length} bab selesai
            </span>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div className="space-y-3" data-testid="chapters-list">
        {chapters.map((chapter) => {
          const isExpanded = expandedChapter === chapter.id;
          const progress = getChapterProgress(chapter);
          const statusConfig = STATUS_CONFIG[chapter.status] || STATUS_CONFIG.belum_mulai;
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={chapter.id}
              className="bg-white rounded-lg border border-[#E2E5DE] overflow-hidden"
              data-testid={`chapter-${chapter.chapter_id}`}
            >
              {/* Chapter Header */}
              <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[#F9F9F6] transition-colors"
                onClick={() => setExpandedChapter(isExpanded ? null : chapter.id)}
              >
                <button className="text-[#8A9087]">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <StatusIcon className="w-5 h-5 flex-shrink-0" style={{ color: statusConfig.color }} />

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-medium text-[#1C1C19]">{chapter.title}</h4>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium"
                      style={{ background: statusConfig.bg, color: statusConfig.color }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex-1 max-w-[200px] h-1.5 bg-[#F0F2ED] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: statusConfig.color }}
                      />
                    </div>
                    <span className="text-xs text-[#8A9087]">{progress}%</span>
                    <span className="text-xs text-[#8A9087]">
                      {chapter.current_pages || 0}/{chapter.target_pages} hal
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[#E2E5DE] pt-4 ml-9" data-testid={`chapter-detail-${chapter.chapter_id}`}>
                  {/* Status & Pages */}
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-medium text-[#8A9087] uppercase tracking-wide">Status</label>
                      <select
                        data-testid={`status-select-${chapter.chapter_id}`}
                        value={chapter.status}
                        onChange={(e) => changeStatus(chapter, e.target.value)}
                        className="mt-1 block px-2 py-1.5 rounded border border-[#E2E5DE] text-xs focus:outline-none focus:ring-1 focus:ring-[#4A6B46]/30"
                      >
                        <option value="belum_mulai">Belum Mulai</option>
                        <option value="sedang_dikerjakan">Sedang Dikerjakan</option>
                        <option value="revisi">Revisi</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#8A9087] uppercase tracking-wide">Halaman Saat Ini</label>
                      <input
                        data-testid={`pages-input-${chapter.chapter_id}`}
                        type="number"
                        value={chapter.current_pages || 0}
                        onChange={(e) => updatePages(chapter, e.target.value)}
                        className="mt-1 block w-20 px-2 py-1.5 rounded border border-[#E2E5DE] text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#4A6B46]/30"
                      />
                    </div>
                    <div className="text-xs text-[#8A9087] mt-4">
                      Target: {chapter.target_pages} halaman
                    </div>
                  </div>

                  {/* Subtasks */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-[#8A9087] uppercase tracking-wide">Sub-bagian</label>
                    {chapter.subtasks.map((task, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-2.5 py-1.5 px-2 rounded hover:bg-[#F9F9F6] cursor-pointer transition-colors"
                        data-testid={`subtask-${chapter.chapter_id}-${idx}`}
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleSubtask(chapter, idx)}
                          className="w-4 h-4 rounded border-[#E2E5DE] text-[#4A6B46] focus:ring-[#4A6B46]/20"
                        />
                        <span className={`text-sm ${task.completed ? "line-through text-[#8A9087]" : "text-[#1C1C19]"}`}>
                          {task.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
