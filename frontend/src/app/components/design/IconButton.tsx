import React from "react";
import { cn } from "../ui/utils";

type IconButtonVariant = "primary" | "secondary" | "ghost";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  label: string;
  children: React.ReactNode;
}

const variantStyles: Record<IconButtonVariant, string> = {
  primary:
    "bg-[var(--ds-accent)] text-white hover:bg-[var(--ds-accent-hover)] shadow-sm",
  secondary:
    "bg-[var(--ds-bg-tertiary)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-primary)]",
  ghost:
    "text-[var(--ds-text-tertiary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "size-8 rounded-[var(--ds-radius-md)]",
  md: "size-10 rounded-[var(--ds-radius-lg)]",
  lg: "size-12 rounded-[var(--ds-radius-xl)]",
};

export function IconButton({
  variant = "secondary",
  size = "md",
  label,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "ds-focus-ring inline-flex items-center justify-center shrink-0 transition-all duration-[var(--ds-duration-fast)] ease-[var(--ds-ease-out)] select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
