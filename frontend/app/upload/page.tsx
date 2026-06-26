"use client";
import { useState, useCallback } from "react";
import axios from "axios";
import AppShell from "../components/AppShell";
import {
  CloudUpload,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface IndexedPaper {
  name: string;
  chunks: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [indexed, setIndexed] = useState<IndexedPaper[]>([]);

  // ── File validation ──────────────────────────────────────────────────────────
  const acceptFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setErrorMsg("Only PDF files are supported.");
      setStatus("error");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setErrorMsg("File exceeds the 50 MB limit.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    setProgress(0);
  };

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload ──────────────────────────────────────────────────────────────────
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(10);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Step 1: POST file — backend returns 202 immediately with task_id
      const res = await axios.post(`${BACKEND}/api/upload`, formData, {
        headers: { "X-API-Key": API_KEY },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.min(40, Math.round((ev.loaded / ev.total) * 40)));
        },
      });

      const { task_id } = res.data;
      if (!task_id) throw new Error("No task ID returned from server");

      // Step 2: Poll /api/upload/status/:task_id every 3s until done or failed
      const savedFile = file;
      setFile(null);
      let chunks = 0;

      await new Promise<void>((resolve, reject) => {
        let ticks = 0;
        const interval = setInterval(async () => {
          try {
            ticks += 1;
            setProgress(Math.min(95, 40 + ticks * 5));
            const s = await axios.get(`${BACKEND}/api/upload/status/${task_id}`, {
              headers: { "X-API-Key": API_KEY },
            });
            if (s.data.status === "done") {
              clearInterval(interval);
              chunks = s.data.result?.chunks_created ?? 0;
              resolve();
            } else if (s.data.status === "failed") {
              clearInterval(interval);
              reject(new Error(s.data.error ?? "Indexing failed"));
            }
          } catch (e) { clearInterval(interval); reject(e); }
        }, 3000);
      });

      setProgress(100);
      setStatus("success");
      setIndexed((prev) => [{ name: savedFile.name, chunks }, ...prev]);
    } catch (e: unknown) {
      setStatus("error");
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setErrorMsg(msg);
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-y-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-5">

          {/* Header */}
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft size={14} />
              Back to chat
            </a>
            <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Upload a paper
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Drop a PDF and the AI will index it for questioning.
            </p>
          </div>

          {/* Drop zone */}
          <label
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className="block cursor-pointer rounded-2xl p-10 text-center transition-all"
            style={{
              border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`,
              background: isDragging ? "var(--accent-muted)" : "var(--surface)",
            }}
          >
            <CloudUpload
              size={36}
              className="mx-auto mb-3"
              style={{ color: isDragging ? "var(--accent)" : "var(--text-muted)" }}
            />
            <p className="text-sm font-medium" style={{ color: isDragging ? "var(--accent-text)" : "var(--text-primary)" }}>
              {file ? file.name : "Drop your PDF here"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB - ready to upload`
                : "or click to browse · PDF only · max 50 MB"}
            </p>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && acceptFile(e.target.files[0])}
            />
          </label>

          {/* Progress bar (during upload) */}
          {status === "uploading" && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                <span className="flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" />
                  Indexing into vector database…
                </span>
                <span className="font-medium" style={{ color: "var(--accent)" }}>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--background)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: "var(--accent)" }}
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          {status !== "uploading" && (
            <button
              onClick={handleUpload}
              disabled={!file}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 active:scale-[0.98]"
              style={{ background: "var(--accent)" }}
            >
              Upload & Index
            </button>
          )}

          {/* Success */}
          {status === "success" && (
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "var(--success-bg)",
                border: "1px solid var(--success-border)",
              }}
            >
              <CheckCircle2 size={16} style={{ color: "var(--success-text)", marginTop: 2 }} className="shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--success-text)" }}>
                  Paper indexed successfully!
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-1 text-xs mt-2 font-medium underline"
                  style={{ color: "var(--success-text)" }}
                >
                  Go to chat →
                </a>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "var(--error-bg)",
                border: "1px solid var(--error-border)",
              }}
            >
              <XCircle size={16} style={{ color: "var(--error-text)", marginTop: 2 }} className="shrink-0" />
              <p className="text-sm" style={{ color: "var(--error-text)" }}>{errorMsg}</p>
            </div>
          )}

          {indexed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Indexed this session
              </p>
              {indexed.map((paper, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)" }}>
                  <FileText size={15} style={{ color: "var(--success-text)" }} className="shrink-0" />
                  <span className="text-sm flex-1 truncate" style={{ color: "var(--success-text)" }}>{paper.name}</span>
                  <span className="text-xs shrink-0" style={{ color: "var(--success-text)", opacity: 0.7 }}>{paper.chunks} chunks</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
