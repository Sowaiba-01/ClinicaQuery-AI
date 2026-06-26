"use client";
import { signIn } from "next-auth/react";
import { FlaskConical, Brain, BookOpen, ShieldCheck, Zap } from "lucide-react";

const features = [
  { icon: Brain, title: "RAG-powered answers", desc: "Retrieval-augmented generation pulls exact passages from your uploaded papers before generating any answer." },
  { icon: BookOpen, title: "Source attribution", desc: "Every answer cites the paper and page it came from. Expand any source card to read the original excerpt." },
  { icon: ShieldCheck, title: "Confidence scoring", desc: "A second Gemini call fact-checks the answer against source text and returns a 0–100 confidence score." },
  { icon: Zap, title: "Streaming responses", desc: "Answers stream token-by-token so you are never staring at a spinner waiting for a wall of text." },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 px-12 py-12" style={{ background: "#0a0a0a", borderRight: "1px solid #1f1f1f" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.2)" }}>
            <FlaskConical size={18} style={{ color: "#fb923c" }} />
          </div>
          <span className="text-base font-semibold text-white tracking-tight">MedResearch AI</span>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white leading-tight">Ask your medical papers anything.</h1>
            <p className="text-base leading-relaxed" style={{ color: "#6b6b6b" }}>
              Upload a PDF, ask a question, and get answers grounded in exact passages — with citations and a confidence score.
            </p>
          </div>
          <div className="space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(249,115,22,0.12)" }}>
                  <Icon size={15} style={{ color: "#fb923c" }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4a4a4a" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "#2a2a2a" }}>For research purposes only. Always consult a licensed physician.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ background: "var(--background)" }}>
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
            <FlaskConical size={16} style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>MedResearch AI</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Welcome back</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sign in to access your research workspace</p>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>secure OAuth 2.0</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="lg:hidden flex flex-wrap gap-2">
            {["RAG-powered", "Source citations", "Confidence scores", "Streaming answers"].map((f) => (
              <span key={f} className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid rgba(249,115,22,0.2)" }}>{f}</span>
            ))}
          </div>

          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            For research purposes only. Always consult a licensed physician.
          </p>
        </div>
      </div>
    </div>
  );
}
