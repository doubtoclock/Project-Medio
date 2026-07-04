import React from "react";
import { cn } from "../ui/utils";

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "error" | "info";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral:
    "bg-[var(--ds-bg-tertiary)] text-[var(--ds-text-secondary)]",
  accent:
    "bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]",
  success:
    "bg-[var(--ds-success-soft)] text-[var(--ds-success-text)]",
  warning:
    "bg-[var(--ds-warning-soft)] text-[var(--ds-warning-text)]",
  error:
    "bg-[var(--ds-error-soft)] text-[var(--ds-error-text)]",
  info:
    "bg-[var(--ds-info-soft)] text-[var(--ds-info-text)]",
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--ds-text-tertiary)]",
  accent: "bg-[var(--ds-accent)]",
  success: "bg-[var(--ds-success)]",
  warning: "bg-[var(--ds-warning)]",
  error: "bg-[var(--ds-error)]",
  info: "bg-[var(--ds-info)]",
};

export function Badge({
  variant = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--ds-radius-full)]",
        "text-[var(--ds-text-xs)] font-[var(--ds-weight-semibold)] whitespace-nowrap",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            dotColors[variant],
          )}
        />
      )}
      {children}
    </span>
  );
}
