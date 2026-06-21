"use client";
import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";

interface SourceCardProps {
  source: {
    text_snippet: string;
    source_file: string;
    relevance_score: number | null;
  };
}

export default function SourceCard({ source }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const score = source.relevance_score
    ? Math.round(source.relevance_score * 100)
    : null;

  // Strip UUID prefix from filename if present (e.g. "abc123_paper.pdf" → "paper.pdf")
  const displayName = source.source_file.replace(/^[a-f0-9-]{36}_/, "");

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
      >
        <FileText size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span
          className="text-xs font-medium flex-1 truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {displayName}
        </span>
        {score !== null && (
          <span
            className="text-xs shrink-0 px-1.5 py-0.5 rounded font-medium"
            style={{
              background: "var(--accent-muted)",
              color: "var(--accent-text)",
            }}
          >
            {score}% match
          </span>
        )}
        {expanded ? (
          <ChevronUp size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        ) : (
          <ChevronDown size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        )}
      </button>

      {/* Snippet */}
      {expanded && (
        <div
          className="px-3 pb-3 text-xs leading-relaxed"
          style={{
            color: "var(--text-secondary)",
            borderTop: "1px solid var(--border)",
            paddingTop: "10px",
          }}
        >
          {source.text_snippet}
        </div>
      )}
    </div>
  );
}
