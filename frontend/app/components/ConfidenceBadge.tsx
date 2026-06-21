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
      icon: ShieldCheck,
      label: "High confidence",
    },
    medium: {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#b45309",
      icon: ShieldAlert,
      label: "Medium confidence",
    },
    low: {
      bg: "var(--error-bg)",
      border: "var(--error-border)",
      text: "var(--error-text)",
      icon: ShieldX,
      label: "Low confidence",
    },
  }[level];

  const Icon = styles.icon;

  return (
    <div
      className="inline-flex flex-col gap-1 px-3 py-2 rounded-xl text-xs"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: styles.text,
      }}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <Icon size={12} />
        {styles.label} · {score}/100
        {!isSupported && <span className="opacity-70">(unsupported by sources)</span>}
      </div>
      {warning && warning !== "null" && (
        <p className="opacity-80 leading-relaxed">{warning}</p>
      )}
    </div>
  );
}
