"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { MessageSquare, Upload, Files, FlaskConical, LogOut, Plus, Trash2 } from "lucide-react";

export interface ChatMeta { id: string; title: string; createdAt: string; }

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null; };
}

const CHATS_KEY = "medresearch_chats";

export function loadChats(): ChatMeta[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CHATS_KEY) ?? "[]"); } catch { return []; }
}
export function saveChats(chats: ChatMeta[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}
export function deleteChat(id: string) {
  saveChats(loadChats().filter((c) => c.id !== id));
  localStorage.removeItem(`medresearch_messages_${id}`);
}

function groupByDate(chats: ChatMeta[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sevenDays = new Date(today.getTime() - 7 * 86400000);
  const groups: Record<string, ChatMeta[]> = { Today: [], Yesterday: [], "Last 7 days": [], Older: [] };
  for (const chat of chats) {
    const d = new Date(chat.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Today"].push(chat);
    else if (day >= yesterday) groups["Yesterday"].push(chat);
    else if (day >= sevenDays) groups["Last 7 days"].push(chat);
    else groups["Older"].push(chat);
  }
  return Object.entries(groups).filter(([, v]) => v.length > 0).map(([label, items]) => ({ label, items }));
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeChatId = searchParams.get("chat");
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setChats(loadChats());
    const handler = () => setChats(loadChats());
    window.addEventListener("medresearch_chats_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("medresearch_chats_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    deleteChat(id);
    setChats(loadChats());
    if (activeChatId === id) router.push("/");
  };

  const groups = groupByDate(chats);

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 shrink-0" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
          <FlaskConical size={15} className="text-orange-400" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">MedResearch AI</span>
      </div>

      {/* New Chat */}
      <div className="px-3 py-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 active:scale-[0.98]"
          style={{ background: "rgba(249,115,22,0.15)", color: "#fdba74" }}
        >
          <Plus size={14} />
          New chat
        </button>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-2 pb-2">
        {chats.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare size={20} className="mx-auto mb-2 text-slate-600" />
            <p className="text-xs" style={{ color: "#475569" }}>No chats yet</p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-2">
              <p className="px-2 py-1 text-xs font-medium uppercase tracking-wider" style={{ color: "#334155" }}>{label}</p>
              {items.map((chat) => {
                const isActive = pathname === "/" && activeChatId === chat.id;
                return (
                  <div key={chat.id} className="relative group" onMouseEnter={() => setHoveredId(chat.id)} onMouseLeave={() => setHoveredId(null)}>
                    <a
                      href={`/?chat=${chat.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
                      style={isActive
                        ? { background: "rgba(249,115,22,0.12)", color: "#fed7aa", border: "1px solid rgba(249,115,22,0.3)" }
                        : { color: "#64748b", border: "1px solid transparent" }
                      }
                    >
                      <MessageSquare size={12} className="shrink-0" style={{ color: isActive ? "#fb923c" : "#334155" }} />
                      <span className="flex-1 truncate leading-snug">{chat.title}</span>
                    </a>
                    {hoveredId === chat.id && (
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
                        title="Delete"
                      >
                        <Trash2 size={11} style={{ color: "#475569" }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom nav */}
      <div className="shrink-0 px-2 py-3 space-y-0.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {[
          { href: "/upload", label: "Upload PDF", icon: Upload },
          { href: "/papers", label: "My Papers", icon: Files },
        ].map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={active
                ? { background: "rgba(249,115,22,0.12)", color: "#fed7aa", border: "1px solid rgba(249,115,22,0.3)" }
                : { color: "#475569", border: "1px solid transparent" }
              }
            >
              <Icon size={14} />
              {label}
            </a>
          );
        })}
      </div>

      {/* User */}
      <div className="shrink-0 px-2 pb-3 pt-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? "User"} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ background: "var(--accent)" }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user.name ?? "User"}</p>
            <p className="text-xs truncate" style={{ color: "#475569" }}>{user.email}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out" className="p-1 rounded hover:bg-white/10 transition-colors">
            <LogOut size={13} style={{ color: "#475569" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
