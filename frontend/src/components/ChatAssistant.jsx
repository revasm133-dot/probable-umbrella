import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { Send, Plus, Trash2, Paperclip, X, FileText, Image } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AI_AVATAR = "https://static.prod-images.emergentagent.com/jobs/cd22c020-fb63-4fca-9cbf-fb0e69633132/images/0645387478a63632fbd20a402ce32a6260e6bc4a53ae2688d8b1b3fcbcb41a54.png";

function getFileIcon(file) {
  if (file.type?.startsWith("image/")) return Image;
  return FileText;
}

function formatSize(bytes) {
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

  // ✅ FIX: tanpa eslint-disable
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

      if (activeSession === sessionId) {
        setActiveSession(updated.length > 0 ? updated[0].id : null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024);
    setAttachedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    let sessionId = activeSession;

    if (!sessionId) {
      try {
        const res = await axios.post(`${API}/chat/sessions`);
        setSessions((prev) => [res.data, ...prev]);
        setActiveSession(res.data.id);
        sessionId = res.data.id;
      } catch (e) {
        console.error(e);
        return;
      }
    }

    const fileNames = attachedFiles.map((f) => f.name);

    const userMsg = {
      role: "user",
      content: input,
      id: Date.now().toString(),
      attachments: fileNames,
    };

    setMessages((prev) => [...prev, userMsg]);

    const currentInput = input;
    const currentFiles = [...attachedFiles];

    setInput("");
    setAttachedFiles([]);
    setLoading(true);

    try {
      let uploadedFileInfos = [];

      for (const file of currentFiles) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const uploadRes = await axios.post(`${API}/files/upload`, formData);
          uploadedFileInfos.push(uploadRes.data);
        } catch (err) {
          console.error(err);
        }
      }

      let chatMessage = currentInput;

      if (uploadedFileInfos.length > 0) {
        const fileDescriptions = uploadedFileInfos
          .map((f) => `File "${f.original_name}"`)
          .join(", ");

        chatMessage += `\n\n[File: ${fileDescriptions}]`;
      }

      const res = await axios.post(`${API}/chat/send`, {
        session_id: sessionId,
        message: chatMessage,
      });

      setMessages((prev) => [...prev, res.data]);
      fetchSessions();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Maaf, terjadi kesalahan.",
          id: "error",
        },
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
    <div className="flex h-screen">
      <div className="w-64 border-r flex flex-col">
        <div className="p-4">
          <button onClick={createSession} className="w-full bg-green-700 text-white p-2 rounded">
            <Plus /> Sesi Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
         {(Array.isArray(messages) ? messages : []).map((msg, i) => (
            <div key={s.id} onClick={() => setActiveSession(s.id)} className="p-2 cursor-pointer">
              {s.title}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border p-2"
          />
          <button onClick={sendMessage} className="bg-green-700 text-white p-2 rounded">
            <Send />
          </button>
        </div>
      </div>
    </div>
  );
}
