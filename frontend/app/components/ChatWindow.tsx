"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SourceCard from "./SourceCard";
import ConfidenceBadge from "./ConfidenceBadge";
import { Send, FlaskConical, Plus, Sparkles } from "lucide-react";
import { loadChats, saveChats } from "./Sidebar";

interface Source { text_snippet: string; source_file: string; page_label: string | null; relevance_score: number | null; }
interface Guardrails { confidence_score: number; is_supported: boolean; warning: string | null; }
interface Message { role: "user" | "assistant"; content: string; sources?: Source[]; guardrails?: Guardrails; streaming?: boolean; }

const MSG_PREFIX = "medresearch_messages_";

function loadMessages(id: string): Message[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(MSG_PREFIX + id) ?? "[]"); } catch { return []; }
}
function persistMessages(id: string, msgs: Message[]) {
  if (typeof window === "undefined") return;
  const clean = msgs.filter((m) => !m.streaming).map(({ streaming: _s, ...r }) => r);
  localStorage.setItem(MSG_PREFIX + id, JSON.stringify(clean));
}
function genId() { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1,-1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="px-1 rounded text-xs font-mono" style={{ background:"rgba(249,115,22,0.1)", color:"var(--accent)" }}>{p.slice(1,-1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const els: React.ReactNode[] = [];
  let buf: string[] = [];
  const flush = (k: string) => { if (buf.length) { els.push(<ul key={k} className="my-1 pl-4 list-disc space-y-0.5">{buf.map((b,i)=><li key={i} className="text-sm leading-relaxed">{renderInline(b)}</li>)}</ul>); buf=[]; } };
  lines.forEach((l, i) => {
    const isList = /^[-*]\s/.test(l) || /^\d+\.\s/.test(l);
    if (!isList) flush(`l${i}`);
    if (l.startsWith("## ") || l.startsWith("### ")) els.push(<p key={i} className="text-sm font-semibold mt-2 mb-0.5">{renderInline(l.replace(/^#{2,3}\s/,""))}</p>);
    else if (/^[-*]\s/.test(l)) buf.push(l.slice(2));
    else if (/^\d+\.\s/.test(l)) buf.push(l.replace(/^\d+\.\s/,""));
    else if (l.trim()==="") els.push(<div key={i} className="h-1.5"/>);
    else els.push(<p key={i} className="text-sm leading-relaxed">{renderInline(l)}</p>);
  });
  flush("end");
  return <div className="space-y-0.5">{els}</div>;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0,1,2].map(i=>(
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:"var(--text-muted)", animation:`tdot 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
      <style>{`@keyframes tdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  );
}

function Cursor() {
  return <span className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-sm" style={{ background:"var(--accent)", animation:"cblink 1s step-start infinite" }}><style>{`@keyframes cblink{0%,100%{opacity:1}50%{opacity:0}}`}</style></span>;
}

function UserAvatar({ name }: { name?: string | null }) {
  const initials = name
    ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white" style={{ background: "var(--accent)" }}>
      {initials}
    </div>
  );
}

const SUGGESTIONS = [
  "What are the main findings of this paper?",
  "What methods were used in this study?",
  "What are the limitations mentioned?",
  "What do the authors recommend for future research?",
];

export default function ChatWindow({ initialChatId }: { initialChatId?: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset or load messages whenever the chat ID in URL changes (including clearing for new chat)
  useEffect(() => {
    if (initialChatId) {
      setChatId(initialChatId);
      setMessages(loadMessages(initialChatId));
    } else {
      setChatId("");
      setMessages([]);
    }
  }, [initialChatId]);

  useEffect(() => {
    if (!chatId || messages.some(m=>m.streaming)) return;
    persistMessages(chatId, messages);
  }, [messages, chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const registerChat = useCallback((id: string, firstMsg: string) => {
    const title = firstMsg.length > 45 ? firstMsg.slice(0,45)+"…" : firstMsg;
    const chats = loadChats();
    if (!chats.some(c=>c.id===id)) {
      saveChats([{ id, title, createdAt: new Date().toISOString() }, ...chats]);
      window.dispatchEvent(new Event("medresearch_chats_updated"));
    }
  }, []);

  const sendMessage = useCallback(async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    let cid = chatId;
    if (!cid) {
      cid = genId();
      setChatId(cid);
      router.replace(`/?chat=${cid}`, { scroll: false });
    }

    setMessages(prev => [...prev, { role:"user", content:text }]);
    setInput("");
    setLoading(true);
    registerChat(cid, text);
    setMessages(prev => [...prev, { role:"assistant", content:"", streaming:true }]);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/api/query`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ question:text }),
      });
      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type==="token") {
              setMessages(prev => { const u=[...prev]; const l=u[u.length-1]; if (l?.role==="assistant") u[u.length-1]={...l, content:l.content+p.token}; return u; });
            } else if (p.type==="done") {
              setMessages(prev => { const u=[...prev]; const l=u[u.length-1]; if (l?.role==="assistant") u[u.length-1]={...l, streaming:false, sources:p.sources, guardrails:p.guardrails}; return u; });
            } else if (p.type==="error") {
              setMessages(prev => { const u=[...prev]; u[u.length-1]={role:"assistant",content:`Error: ${p.message}`,streaming:false}; return u; });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages(prev => { const u=[...prev]; u[u.length-1]={role:"assistant",content:"Could not reach the backend. Make sure the server is running and a PDF has been uploaded.",streaming:false}; return u; });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, chatId, router, registerChat]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
        <FlaskConical size={16} style={{ color:"var(--accent)" }}/>
        <span className="text-sm font-medium" style={{ color:"var(--text-primary)" }}>{isEmpty ? "New chat" : "Research Chat"}</span>
        <a href="/upload" className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all" style={{ background:"var(--accent)", color:"white" }}>
          <Plus size={13}/>Upload PDF
        </a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-3xl mx-auto">

          {isEmpty && (
            <div className="flex flex-col items-center gap-6 pt-16 pb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:"var(--accent-muted)" }}>
                <FlaskConical size={26} style={{ color:"var(--accent)" }}/>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-base font-semibold" style={{ color:"var(--text-primary)" }}>Ask about your research papers</h2>
                <p className="text-sm max-w-sm" style={{ color:"var(--text-secondary)" }}>Upload a PDF first, then ask questions — the AI will cite exact passages and score its confidence.</p>
              </div>
              <div className="w-full max-w-md space-y-2">
                <p className="text-xs font-medium text-center uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Try asking</p>
                {SUGGESTIONS.map(q => (
                  <button key={q} onClick={()=>sendMessage(q)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-left transition-all active:scale-[0.98]"
                    style={{ background:"var(--surface)", border:"1px solid var(--border)", color:"var(--text-secondary)" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor="var(--accent)"; (e.currentTarget as HTMLElement).style.background="var(--accent-muted)"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="var(--border)"; (e.currentTarget as HTMLElement).style.background="var(--surface)"; }}
                  >
                    <Sparkles size={13} style={{ color:"var(--accent)", flexShrink:0 }}/>{q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role==="user"?"flex-row-reverse":"flex-row"}`}>
                {msg.role==="assistant" ? (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background:"var(--accent-muted)" }}>
                    <FlaskConical size={13} style={{ color:"var(--accent)" }}/>
                  </div>
                ) : (
                  <UserAvatar name={session?.user?.name} />
                )}
                <div className={`max-w-xl space-y-2 flex flex-col ${msg.role==="user"?"items-end":"items-start"}`}>
                  <div className="px-4 py-3 rounded-2xl" style={msg.role==="user"
                    ? { background:"var(--accent)", color:"white", borderRadius:"16px 4px 16px 16px" }
                    : { background:"var(--surface)", color:"var(--text-primary)", border:"1px solid var(--border)", borderRadius:"4px 16px 16px 16px" }
                  }>
                    {msg.role==="assistant" && msg.streaming && msg.content==="" ? <TypingDots/> : <><MarkdownBody text={msg.content}/>{msg.streaming && <Cursor/>}</>}
                  </div>
                  {!msg.streaming && msg.guardrails && <ConfidenceBadge score={msg.guardrails.confidence_score} isSupported={msg.guardrails.is_supported} warning={msg.guardrails.warning}/>}
                  {!msg.streaming && msg.sources && msg.sources.length>0 && (
                    <div className="w-full space-y-1.5">
                      <p className="text-xs font-medium" style={{ color:"var(--text-muted)" }}>{msg.sources.length} source{msg.sources.length>1?"s":""} from uploaded papers</p>
                      {msg.sources.map((src,j)=><SourceCard key={j} source={src}/>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3" style={{ background:"var(--surface)", borderTop:"1px solid var(--border)" }}>
        <div className="max-w-3xl mx-auto flex gap-2.5 items-end">
          <textarea ref={inputRef} rows={1}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl resize-none overflow-hidden transition-colors"
            style={{ background:"var(--background)", border:"1px solid var(--border)", color:"var(--text-primary)", outline:"none", minHeight:"42px", maxHeight:"120px" }}
            value={input}
            onChange={e=>{ setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=`${Math.min(e.target.scrollHeight,120)}px`; }}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
            placeholder="Ask anything about the uploaded paper… (Shift+Enter for newline)"
            disabled={loading}
            onFocus={e=>(e.target.style.border="1px solid var(--accent)")}
            onBlur={e=>(e.target.style.border="1px solid var(--border)")}
          />
          <button onClick={()=>sendMessage()} disabled={loading||!input.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40 active:scale-95 shrink-0"
            style={{ background:"var(--accent)", height:"42px" }}
          >
            <Send size={14}/>Ask
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color:"var(--text-muted)" }}>For research purposes only · Always consult a licensed physician</p>
      </div>
    </div>
  );
}
