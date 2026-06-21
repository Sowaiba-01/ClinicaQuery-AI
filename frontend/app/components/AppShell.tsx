"use client";
import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google");
    }
  }, [status]);

  if (status === "loading" || !session) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--accent)",
              borderTopColor: "transparent",
            }}
          />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={session.user} />
      <main
        className="flex-1 overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        {children}
      </main>
    </div>
  );
}
