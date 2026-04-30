import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Send, Plus, Trash2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AI_AVATAR = "https://static.prod-images.emergentagent.com/jobs/cd22c020-fb63-4fca-9cbf-fb0e69633132/images/0645387478a63632fbd20a402ce32a6260e6bc4a53ae2688d8b1b3fcbcb41a54.png";

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
    if (activeSession) {
      fetchMessages(activeSession);
    }
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/chat/sessions`);
      setSessions(res.data);
      if (res.data.length > 0 && !activeSession) {
        setActiveSession(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const res = await axios.get(`${API}/chat/messages/${sessionId}`);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const createSession = async () => {
    try {
      const res = await axios.post(`${API}/chat/sessions`);
      setSessions([res.data, ...sessions]);
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
      if (activeSession === sessionId) {
        setActiveSession(updated.length > 0 ? updated[0].id : null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!activeSession) {
      await createSession();
      return;
    }

    const userMsg = { role: "user", content: input, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat/send`, {
        session_id: activeSession,
        message: input,
      });
      setMessages((prev) => [...prev, res.data]);
      fetchSessions();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, terjadi kesalahan. Silakan coba lagi.", id: "error" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen" data-testid="chat-page">
      {/* Sessions sidebar */}
      <div className="w-64 border-r border-[#E2E5DE] bg-[#F9F9F6] flex flex-col">
        <div className="p-4 border-b border-[#E2E5DE]">
          <button
            data-testid="new-chat-button"
            onClick={createSession}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[#4A6B46] text-white text-sm font-medium hover:bg-[#3C5739] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Sesi Baru
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-all ${
                activeSession === session.id
                  ? "bg-[#E3EBE1] text-[#1C1C19] font-medium"
                  : "text-[#5C605A] hover:bg-[#F0F2ED]"
              }`}
              onClick={() => setActiveSession(session.id)}
              data-testid={`chat-session-${session.id}`}
            >
              <span className="flex-1 truncate">{session.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                data-testid={`delete-session-${session.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E5DE] bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src={AI_AVATAR} alt="AI" className="w-8 h-8 rounded-full" />
            <div>
              <h2 className="text-base font-medium text-[#1C1C19]">Dosen Pembimbing AI</h2>
              <p className="text-xs text-[#8A9087]">Claude Opus - Asisten Penelitian Skripsi</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" data-testid="chat-messages">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <img src={AI_AVATAR} alt="AI" className="w-16 h-16 rounded-full mb-4 opacity-80" />
              <h3 className="text-lg font-medium text-[#1C1C19]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Dosen Pembimbing AI
              </h3>
              <p className="text-sm text-[#8A9087] mt-2 max-w-md">
                Tanyakan apa saja tentang penelitian skripsi Anda. Saya siap membantu dengan metodologi, 
                analisis data, penulisan, atau tinjauan pustaka.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`flex gap-3 animate-fade-in-up ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <img src={AI_AVATAR} alt="AI" className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
              )}
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#E3EBE1] text-[#1C1C19]"
                    : "bg-[#F0F2ED] text-[#1C1C19]"
                }`}
                data-testid={`chat-message-${msg.role}`}
              >
                {msg.role === "assistant" ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 animate-fade-in-up">
              <img src={AI_AVATAR} alt="AI" className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
              <div className="bg-[#F0F2ED] rounded-lg px-4 py-3 flex gap-1">
                <span className="typing-dot w-2 h-2 rounded-full bg-[#4A6B46]"></span>
                <span className="typing-dot w-2 h-2 rounded-full bg-[#4A6B46]"></span>
                <span className="typing-dot w-2 h-2 rounded-full bg-[#4A6B46]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#E2E5DE] bg-white">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan tentang penelitian Anda..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-[#E2E5DE] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6B46]/20 focus:border-[#4A6B46] bg-white"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              data-testid="chat-send-button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-3 rounded-lg bg-[#4A6B46] text-white hover:bg-[#3C5739] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
