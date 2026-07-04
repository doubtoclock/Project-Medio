import React from "react";
import { cn } from "../ui/utils";
import { Loading } from "./Loading";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--ds-accent)] text-[var(--ds-accent-text)] hover:bg-[var(--ds-accent-hover)] shadow-sm",
  secondary:
    "bg-[var(--ds-bg-tertiary)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-primary)]",
  ghost:
    "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]",
  outline:
    "border border-[var(--ds-border-secondary)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)] hover:border-[var(--ds-border-strong)]",
  danger:
    "bg-[var(--ds-error)] text-white hover:opacity-90 shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[var(--ds-text-sm)] gap-1.5 rounded-[var(--ds-radius-md)]",
  md: "h-10 px-4 text-[var(--ds-text-base)] gap-2 rounded-[var(--ds-radius-lg)]",
  lg: "h-12 px-6 text-[var(--ds-text-md)] gap-2.5 rounded-[var(--ds-radius-xl)]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "ds-focus-ring inline-flex items-center justify-center font-[var(--ds-weight-semibold)] transition-all duration-[var(--ds-duration-normal)] ease-[var(--ds-ease-out)] select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loading size="sm" className="shrink-0" />
      )}
      {children}
    </button>
  );
}
