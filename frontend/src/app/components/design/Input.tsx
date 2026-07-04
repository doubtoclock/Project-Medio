import React, { useId } from "react";
import { cn } from "../ui/utils";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  prefix,
  suffix,
  className,
  id: idProp,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = idProp || generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[var(--ds-text-sm)] font-[var(--ds-weight-medium)] text-[var(--ds-text-secondary)]"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "flex items-center gap-2 h-10 px-3 rounded-[var(--ds-radius-lg)]",
          "bg-[var(--ds-bg-tertiary)] border border-[var(--ds-border-primary)]",
          "transition-all duration-[var(--ds-duration-fast)] ease-[var(--ds-ease-out)]",
          "focus-within:border-[var(--ds-accent)] focus-within:shadow-[var(--ds-shadow-glow-sm)]",
          error && "border-[var(--ds-error)] focus-within:border-[var(--ds-error)] focus-within:shadow-none",
          props.disabled && "opacity-50 pointer-events-none",
        )}
      >
        {prefix && (
          <span className="shrink-0 text-[var(--ds-text-tertiary)]">
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          className={cn(
            "flex-1 bg-transparent text-[var(--ds-text-primary)] text-[var(--ds-text-base)]",
            "placeholder:text-[var(--ds-text-placeholder)]",
            "outline-none border-none",
            className,
          )}
          {...props}
        />

        {suffix && (
          <span className="shrink-0 text-[var(--ds-text-tertiary)]">
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[var(--ds-text-xs)] text-[var(--ds-error-text)]">
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-[var(--ds-text-xs)] text-[var(--ds-text-tertiary)]">
          {hint}
        </p>
      )}
    </div>
  );
}
