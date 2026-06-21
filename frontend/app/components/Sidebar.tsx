"use client";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  MessageSquare,
  Upload,
  Files,
  FlaskConical,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/upload", label: "Upload PDF", icon: Upload },
  { href: "/papers", label: "My Papers", icon: Files, disabled: true },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <aside
      className="flex flex-col w-56 shrink-0 h-screen"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ background: "rgba(99,102,241,0.2)" }}
        >
          <FlaskConical size={15} className="text-indigo-400" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">
          MedResearch AI
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 sidebar-scroll overflow-y-auto">
        <p className="px-2 mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: "#475569" }}>
          Workspace
        </p>
        {navItems.map(({ href, label, icon: Icon, disabled }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={disabled ? undefined : href}
              aria-disabled={disabled}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                ${disabled ? "cursor-default opacity-40" : "cursor-pointer"}
                ${
                  active
                    ? "text-indigo-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }
              `}
              style={
                active
                  ? {
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                    }
                  : undefined
              }
            >
              <Icon size={15} className={active ? "text-indigo-400" : ""} />
              <span>{label}</span>
              {disabled && (
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "#1e293b", color: "#475569", fontSize: "10px" }}
                >
                  Soon
                </span>
              )}
              {active && <ChevronRight size={12} className="ml-auto text-indigo-400 opacity-60" />}
            </a>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-2 pb-4" style={{ borderTop: "1px solid var(--sidebar-border)", paddingTop: "12px" }}>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "User"}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user.name ?? "User"}</p>
            <p className="text-xs truncate" style={{ color: "#475569" }}>
              {user.email}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <LogOut size={13} style={{ color: "#475569" }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
