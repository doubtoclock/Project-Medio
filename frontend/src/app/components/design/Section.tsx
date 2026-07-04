import React from "react";
import { cn } from "../ui/utils";

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({
  title,
  description,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && (
            <h2 className="text-[var(--ds-text-md)] font-[var(--ds-weight-semibold)] text-[var(--ds-text-primary)]">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-[var(--ds-text-sm)] text-[var(--ds-text-tertiary)]">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
