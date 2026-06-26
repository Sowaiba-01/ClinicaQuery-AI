"use client";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { FlaskConical, Play, RefreshCw, BookOpen, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface Scores { faithfulness: number; answer_relevance: number; context_precision: number; overall: number; }
interface PerQuestion { question: string; answer: string; faithfulness: number; answer_relevance: number; context_precision: number; sources_count: number; }

function ScoreGauge({ label, value, description }: { label: string; value: number; description: string }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? "#22c55e" : value >= 0.5 ? "#f97316" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="36" fill="none" strokeWidth="8" style={{ stroke: "var(--border)" }} />
        <circle cx="50" cy="50" r="36" fill="none" strokeWidth="8"
          stroke={color} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{pct}%</text>
      </svg>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: number }) {
  const color = value >= 0.75 ? "#22c55e" : value >= 0.5 ? "#f97316" : "#ef4444";
  return <span className="text-xs font-bold" style={{ color }}>{Math.round(value * 100)}%</span>;
}

export default function EvaluationPage() {
  const [status, setStatus] = useState<"idle"|"generating"|"running"|"done"|"error">("idle");
  const [scores, setScores] = useState<Scores | null>(null);
  const [perQuestion, setPerQuestion] = useState<PerQuestion[]>([]);
  const [benchmarkCount, setBenchmarkCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [polling, setPolling] = useState(false);

  // Check for existing results on load
  useEffect(() => {
    fetchResults(true);
    fetchBenchmarkCount();
  }, []);

  // Poll while running
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => fetchResults(false), 4000);
    return () => clearInterval(id);
  }, [polling]);

  async function fetchBenchmarkCount() {
    try {
      const res = await fetch(`${BACKEND}/api/evaluate/benchmark`);
      const data = await res.json();
      if (data.status === "ok") setBenchmarkCount(data.questions.length);
    } catch {}
  }

  async function fetchResults(silent = false) {
    try {
      const res = await fetch(`${BACKEND}/api/evaluate/results`);
      const data = await res.json();
      if (data.status === "running") { setStatus("running"); setPolling(true); return; }
      if (data.status === "ok") {
        setScores(data.aggregate);
        setPerQuestion(data.per_question ?? []);
        setStatus("done");
        setPolling(false);
      } else if (!silent) {
        setStatus("idle");
      }
    } catch {
      if (!silent) setErrorMsg("Cannot reach backend.");
    }
  }

  async function handleGenerate() {
    setStatus("generating");
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND}/api/evaluate/generate-benchmark`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed");
      setBenchmarkCount(data.questions_generated);
      setStatus("idle");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Error generating benchmark");
      setStatus("error");
    }
  }

  async function handleRun() {
    setStatus("running");
    setPolling(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND}/api/evaluate/run`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Failed to start");
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Error starting evaluation");
      setStatus("error");
      setPolling(false);
    }
  }

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <a href="/" className="p-2 rounded-lg hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft size={16} />
            </a>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>RAG Evaluation</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Gemini-as-judge scoring: Faithfulness · Answer Relevance · Context Precision
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleGenerate} disabled={status === "generating" || status === "running"}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {status === "generating" ? <Loader2 size={14} className="animate-spin"/> : <BookOpen size={14}/>}
              {status === "generating" ? "Generating…" : benchmarkCount ? `Regenerate Benchmark (${benchmarkCount}q)` : "1. Generate Benchmark"}
            </button>

            <button onClick={handleRun} disabled={!benchmarkCount || status === "running" || status === "generating"}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "var(--accent)" }}>
              {status === "running" ? <Loader2 size={14} className="animate-spin"/> : <Play size={14}/>}
              {status === "running" ? "Evaluating…" : "2. Run Evaluation"}
            </button>

            {scores && (
              <button onClick={() => fetchResults(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <RefreshCw size={14}/>Refresh
              </button>
            )}
          </div>

          {/* Status messages */}
          {status === "running" && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }}/>
              <p className="text-sm" style={{ color: "var(--accent)" }}>
                Evaluation running — Gemini is judging each answer. This takes 1–2 minutes.
              </p>
            </div>
          )}
          {(status === "error" || errorMsg) && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)" }}>
              <AlertCircle size={16} style={{ color: "var(--error-text)" }}/>
              <p className="text-sm" style={{ color: "var(--error-text)" }}>{errorMsg}</p>
            </div>
          )}

          {/* Score gauges */}
          {scores && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreGauge label="Overall" value={scores.overall} description="Mean of all metrics" />
                <ScoreGauge label="Faithfulness" value={scores.faithfulness} description="No hallucinations" />
                <ScoreGauge label="Answer Relevance" value={scores.answer_relevance} description="On-topic answers" />
                <ScoreGauge label="Context Precision" value={scores.context_precision} description="Retrieval quality" />
              </div>

              {/* Per-question breakdown */}
              {perQuestion.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="px-4 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Per-question breakdown</p>
                  </div>
                  <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
                    {perQuestion.map((row, i) => (
                      <div key={i} className="px-4 py-3 space-y-1.5" style={{ background: "var(--background)" }}>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.question}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{row.answer}</p>
                        <div className="flex gap-4 pt-1">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Faith <StatusBadge value={row.faithfulness}/>
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Rel <StatusBadge value={row.answer_relevance}/>
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Prec <StatusBadge value={row.context_precision}/>
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {row.sources_count} sources
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!scores && status !== "running" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-muted)" }}>
                <FlaskConical size={26} style={{ color: "var(--accent)" }}/>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No evaluation results yet</p>
                <p className="text-sm max-w-sm" style={{ color: "var(--text-secondary)" }}>
                  First upload a PDF and index it, then click <strong>Generate Benchmark</strong> to auto-create test questions, then <strong>Run Evaluation</strong> to score the RAG pipeline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
