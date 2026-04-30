// 🔥 FORCE REDEPLOY (hapus nanti kalau sudah normal)
console.log("CHAT FIX DEPLOYED");

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Send, Plus, Trash2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : "/api";

export default function ChatAssistant() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

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

  // ✅ SAFE FETCH MESSAGES (ANTI ERROR)
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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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

    // ✅ FIX: selalu array
    setMessages((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      userMsg,
    ]);

    setInput("");
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
          <div
            key={s.id}
            onClick={() => setActiveSession(s.id)}
            style={{ cursor: "pointer", marginTop: "8px" }}
          >
            {s.title || "Tanpa judul"}
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {/* ✅ FIX ANTI CRASH */}
          {(!Array.isArray(messages) || messages.length === 0) && !loading && (
            <p>Belum ada chat</p>
          )}

          {/* ✅ FIX MAP ERROR */}
          {(Array.isArray(messages) ? messages : []).map((msg, i) => (
            <div key={msg?.id || i} style={{ marginBottom: "10px" }}>
              <b>{msg?.role || "unknown"}:</b>
              <ReactMarkdown>{msg?.content || ""}</ReactMarkdown>
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
