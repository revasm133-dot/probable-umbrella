import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Send, Plus, Trash2, Paperclip, X, FileText, Image } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : "/api";

const AI_AVATAR =
  "https://static.prod-images.emergentagent.com/jobs/cd22c020-fb63-4fca-9cbf-fb0e69633132/images/0645387478a63632fbd20a402ce32a6260e6bc4a53ae2688d8b1b3fcbcb41a54.png";

function getFileIcon(file) {
  if (file.type?.startsWith("image/")) return Image;
  return FileText;
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatAssistant() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSession) fetchMessages(activeSession);
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ SAFE FETCH SESSIONS
  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/chat/sessions`);
      const safe = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setSessions(safe);

      if (safe.length > 0 && !activeSession) {
        setActiveSession(safe[0].id);
      }
    } catch (e) {
      console.error(e);
      setSessions([]);
    }
  };

  // ✅ SAFE FETCH MESSAGES (FIX UTAMA)
  const fetchMessages = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/chat/messages/${sessionId}`);

      const safeMessages = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setMessages(safeMessages);
    } catch (e) {
      console.error(e);
      setMessages([]);
    }
  };

  const createSession = async () => {
    try {
      const res = await axios.post(`${API}/chat/sessions`);
      setSessions((prev) => [res.data, ...prev]);
      setActiveSession(res.data.id);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      await axios.delete(`${API}/chat/sessions/${sessionId}`);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      setActiveSession(updated[0]?.id || null);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.size <= 10 * 1024 * 1024);
    setAttachedFiles((prev) => [...prev, ...valid]);
  };

  const removeAttachment = (i) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    let sessionId = activeSession;

    if (!sessionId) {
      const res = await axios.post(`${API}/chat/sessions`);
      setSessions((prev) => [res.data, ...prev]);
      setActiveSession(res.data.id);
      sessionId = res.data.id;
    }

    const userMsg = {
      role: "user",
      content: input,
      id: Date.now().toString(),
    };

    setMessages((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      userMsg,
    ]);

    setInput("");
    setAttachedFiles([]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat/send`, {
        session_id: sessionId,
        message: input,
      });

      setMessages((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        res.data,
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* SIDEBAR */}
      <div className="w-64 border-r p-3">
        <button onClick={createSession}>+ Sesi Baru</button>

        {(Array.isArray(sessions) ? sessions : []).map((s) => (
          <div key={s.id} onClick={() => setActiveSession(s.id)}>
            {s.title}
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {(!Array.isArray(messages) || messages.length === 0) && !loading && (
            <p>Belum ada chat</p>
          )}

          {(Array.isArray(messages) ? messages : []).map((msg, i) => (
            <div key={msg.id || i}>
              <b>{msg.role}:</b>
              <ReactMarkdown>{msg.content || ""}</ReactMarkdown>
            </div>
          ))}

          {loading && <p>Loading...</p>}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div className="p-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border flex-1"
          />
          <button onClick={sendMessage}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
