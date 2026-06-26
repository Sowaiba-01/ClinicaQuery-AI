"use client";
import { useSession } from "next-auth/react";
import { useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    // Only redirect after status is definitively "unauthenticated"
    // and only once (avoids double-redirect loop after OAuth callback)
    if (status === "unauthenticated" && !redirected.current) {
      redirected.current = true;
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {session?.user && (
        <Suspense fallback={<div className="w-60 shrink-0" style={{ background: "var(--sidebar-bg)" }} />}>
          <Sidebar user={session.user} />
        </Suspense>
      )}
      <main className="flex-1 overflow-hidden" style={{ background: "var(--background)" }}>
        {children}
      </main>
    </div>
  );
}
