"use client";
import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

interface SourceCardProps {
  source: {
    text_snippet: string;
    source_file: string;
    page_label?: string | null;
    relevance_score: number | null;
  };
}

export default function SourceCard({ source }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const score = source.relevance_score
    ? Math.round(source.relevance_score * 100)
    : null;

  // Strip UUID prefix from filename (e.g. "abc123_paper.pdf" → "paper.pdf")
  const displayName = source.source_file.replace(/^[a-f0-9-]{36}_/, "");

  // Relevance colour
  const scoreColor =
    score !== null && score >= 80
      ? { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" }
      : score !== null && score >= 60
      ? { bg: "#fffbeb", text: "#b45309", border: "#fde68a" }
      : { bg: "var(--accent-muted)", text: "var(--accent-text)", border: "rgba(99,102,241,0.2)" };

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

        <div className="flex-1 min-w-0">
          <span
            className="text-xs font-medium block truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {displayName}
          </span>
          {source.page_label && (
            <span
              className="inline-flex items-center gap-1 text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              <BookOpen size={10} />
              p. {source.page_label}
            </span>
          )}
        </div>

        {score !== null && (
          <span
            className="text-xs shrink-0 px-1.5 py-0.5 rounded font-semibold tabular-nums"
            style={{
              background: scoreColor.bg,
              color: scoreColor.text,
              border: `1px solid ${scoreColor.border}`,
            }}
          >
            {score}%
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
