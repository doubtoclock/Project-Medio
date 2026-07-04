import React from "react";
import { cn } from "../ui/utils";

type ChipVariant = "default" | "accent" | "success" | "warning" | "error" | "info";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  removable?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}

const variantStyles: Record<ChipVariant, string> = {
  default:
    "bg-[var(--ds-bg-tertiary)] text-[var(--ds-text-secondary)] border-[var(--ds-border-primary)]",
  accent:
    "bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] border-[var(--ds-accent)]/20",
  success:
    "bg-[var(--ds-success-soft)] text-[var(--ds-success-text)] border-[var(--ds-success)]/20",
  warning:
    "bg-[var(--ds-warning-soft)] text-[var(--ds-warning-text)] border-[var(--ds-warning)]/20",
  error:
    "bg-[var(--ds-error-soft)] text-[var(--ds-error-text)] border-[var(--ds-error)]/20",
  info:
    "bg-[var(--ds-info-soft)] text-[var(--ds-info-text)] border-[var(--ds-info)]/20",
};

export function Chip({
  variant = "default",
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--ds-radius-full)]",
        "text-[var(--ds-text-xs)] font-[var(--ds-weight-medium)]",
        "border transition-all duration-[var(--ds-duration-fast)]",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}

      {removable && (
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="inline-flex items-center justify-center size-3.5 rounded-full hover:bg-[var(--ds-bg-hover)] transition-colors"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 2l6 6M8 2l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}
