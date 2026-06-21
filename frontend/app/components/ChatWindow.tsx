"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import SourceCard from "./SourceCard";
import ConfidenceBadge from "./ConfidenceBadge";
import { Send, Loader2, FlaskConical, Plus } from "lucide-react";

interface Source {
  text_snippet: string;
  source_file: string;
  relevance_score: number | null;
}

interface Guardrails {
  confidence_score: number;
  is_supported: boolean;
  warning: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  guardrails?: Guardrails;
}

// ── Simple inline markdown renderer ────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          className="px-1 rounded text-xs font-mono"
          style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    return <span key={i}>{part}</span>;
  });
}

function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={key} className="my-1 space-y-0.5 pl-4 list-disc" style={{ color: "inherit" }}>
          {listBuffer.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const isList = /^[-*]\s/.test(line) || /^\d+\.\s/.test(line);
    if (!isList) flushList(`list-${i}`);

    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="text-sm font-semibold mt-2 mb-0.5" style={{ color: "inherit" }}>
          {renderInline(line.slice(4))}
        </p>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="text-sm font-semibold mt-2 mb-0.5" style={{ color: "inherit" }}>
          {renderInline(line.slice(3))}
        </p>
      );
    } else if (/^[-*]\s/.test(line)) {
      listBuffer.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      listBuffer.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed" style={{ color: "inherit" }}>
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList("list-end");

  return <div className="space-y-0.5">{elements}</div>;
}
// ────────────────────────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! Upload a medical paper using the **Upload PDF** link in the sidebar, then ask me anything about it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/query", {
        question: input,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
          guardrails: res.data.guardrails,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Error getting answer. Make sure the backend is running and a PDF has been uploaded.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <header
        className="flex items-center gap-3 px-5 py-3 shrink-0"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2">
          <FlaskConical size={16} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            New chat
          </span>
        </div>
        <a
          href="/upload"
          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <Plus size={13} />
          Upload PDF
        </a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {msg.role === "assistant" ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--accent-muted)" }}
                >
                  <FlaskConical size={13} style={{ color: "var(--accent)" }} />
                </div>
              ) : session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt="You"
                  className="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {userInitials}
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-xl space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--accent)",
                          color: "white",
                          borderRadius: "16px 4px 16px 16px",
                        }
                      : {
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border)",
                          borderRadius: "4px 16px 16px 16px",
                        }
                  }
                >
                  <MarkdownBody text={msg.content} />
                </div>

                {/* Confidence badge */}
                {msg.guardrails && (
                  <ConfidenceBadge
                    score={msg.guardrails.confidence_score}
                    isSupported={msg.guardrails.is_supported}
                    warning={msg.guardrails.warning}
                  />
                )}

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="w-full space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} from uploaded papers
                    </p>
                    {msg.sources.map((src, j) => (
                      <SourceCard key={j} source={src} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-muted)" }}
              >
                <FlaskConical size={13} style={{ color: "var(--accent)" }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2 text-sm"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  borderRadius: "4px 16px 16px 16px",
                }}
              >
                <Loader2 size={13} className="animate-spin" />
                Searching papers...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-3xl mx-auto flex gap-2.5">
          <input
            ref={inputRef}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl transition-colors"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask anything about the uploaded paper…"
            disabled={loading}
            onFocus={(e) =>
              (e.target.style.border = "1px solid var(--accent)")
            }
            onBlur={(e) =>
              (e.target.style.border = "1px solid var(--border)")
            }
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40 active:scale-95"
            style={{ background: "var(--accent)" }}
          >
            <Send size={14} />
            Ask
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          For research purposes only. Always consult a licensed physician.
        </p>
      </div>
    </div>
  );
}
