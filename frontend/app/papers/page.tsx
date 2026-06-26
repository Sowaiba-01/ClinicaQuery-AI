"use client";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import {
  FileText,
  Layers,
  Calendar,
  HardDrive,
  Trash2,
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Upload,
} from "lucide-react";

interface Paper {
  doc_id: string;
  filename: string;
  chunks: number;
  size_bytes: number;
  uploaded_at: string;
  pages?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchPapers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/api/papers`);
      const data = await res.json();
      setPapers(data.papers ?? []);
    } catch {
      setError("Could not load papers. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleDelete = async (doc_id: string) => {
    setDeletingId(doc_id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"}/api/papers/${doc_id}`, {
        method: "DELETE",
      });
      setPapers((prev) => prev.filter((p) => p.doc_id !== doc_id));
    } catch {
      setError("Failed to remove paper.");
    } finally {
      setDeletingId(null);
    }
  };

  const totalChunks = papers.reduce((sum, p) => sum + p.chunks, 0);
  const totalSize = papers.reduce((sum, p) => sum + p.size_bytes, 0);

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={14} />
              Back to chat
            </a>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  My Papers
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  All PDFs indexed into the vector database
                </p>
              </div>
              <button
                onClick={fetchPapers}
                className="p-2 rounded-lg transition-colors hover:bg-slate-100"
                title="Refresh"
              >
                <RefreshCw size={15} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          </div>

          {/* Stats strip */}
          {papers.length > 0 && (
            <div
              className="grid grid-cols-3 gap-3 p-4 rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {[
                { icon: BookOpen, label: "Papers", value: papers.length },
                { icon: Layers, label: "Chunks", value: totalChunks.toLocaleString() },
                { icon: HardDrive, label: "Total size", value: formatBytes(totalSize) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                  <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    {value}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-sm"
              style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)", color: "var(--error-text)" }}
            >
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading papers…</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && papers.length === 0 && !error && (
            <div
              className="flex flex-col items-center gap-4 py-16 rounded-2xl"
              style={{ border: "2px dashed var(--border)", background: "var(--surface)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent-muted)" }}
              >
                <FileText size={22} style={{ color: "var(--accent)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  No papers indexed yet
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Upload a PDF to get started
                </p>
              </div>
              <a
                href="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: "var(--accent)" }}
              >
                <Upload size={14} />
                Upload a paper
              </a>
            </div>
          )}

          {/* Papers list */}
          {!loading && papers.length > 0 && (
            <div className="space-y-3">
              {papers.map((paper) => (
                <div
                  key={paper.doc_id}
                  className="flex items-start gap-3 px-4 py-4 rounded-2xl transition-all"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "var(--accent-muted)" }}
                  >
                    <FileText size={16} style={{ color: "var(--accent)" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {paper.filename}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Layers size={11} />
                        {paper.chunks} chunks
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <HardDrive size={11} />
                        {formatBytes(paper.size_bytes)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Calendar size={11} />
                        {formatDate(paper.uploaded_at)}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(paper.doc_id)}
                    disabled={deletingId === paper.doc_id}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-40"
                    title="Remove from index"
                  >
                    {deletingId === paper.doc_id ? (
                      <div
                        className="w-3.5 h-3.5 rounded-full border animate-spin"
                        style={{ borderColor: "var(--error-text)", borderTopColor: "transparent" }}
                      />
                    ) : (
                      <Trash2 size={14} style={{ color: "var(--error-text)" }} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload CTA */}
          {!loading && papers.length > 0 && (
            <a
              href="/upload"
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                border: "2px dashed var(--border)",
                color: "var(--text-secondary)",
                background: "var(--surface)",
              }}
            >
              <Upload size={14} />
              Upload another paper
            </a>
          )}

        </div>
      </div>
    </AppShell>
  );
}
