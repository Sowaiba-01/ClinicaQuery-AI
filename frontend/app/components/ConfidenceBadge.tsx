import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface ConfidenceBadgeProps {
  score: number;
  isSupported: boolean;
  warning: string | null;
}

export default function ConfidenceBadge({
  score,
  isSupported,
  warning,
}: ConfidenceBadgeProps) {
  const level = score >= 80 ? "high" : score >= 50 ? "medium" : "low";

  const styles = {
    high: {
      bg: "var(--success-bg)",
      border: "var(--success-border)",
      text: "var(--success-text)",
      bar: "#22c55e",
      icon: ShieldCheck,
      label: "High confidence",
    },
    medium: {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#b45309",
      bar: "#f59e0b",
      icon: ShieldAlert,
      label: "Medium confidence",
    },
    low: {
      bg: "var(--error-bg)",
      border: "var(--error-border)",
      text: "var(--error-text)",
      bar: "#ef4444",
      icon: ShieldX,
      label: "Low confidence",
    },
  }[level];

  const Icon = styles.icon;
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <div
      className="px-3 py-2.5 rounded-xl text-xs space-y-2"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
        minWidth: "200px",
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-medium">
          <Icon size={12} />
          <span>{styles.label}</span>
          {!isSupported && (
            <span className="opacity-60 font-normal">(not in sources)</span>
          )}
        </div>
        <span className="font-semibold tabular-nums">{clampedScore}/100</span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: `${styles.bar}33` }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${clampedScore}%`,
            background: styles.bar,
          }}
        />
      </div>

      {/* Warning */}
      {warning && warning !== "null" && (
        <p className="opacity-80 leading-relaxed">{warning}</p>
      )}
    </div>
  );
}
