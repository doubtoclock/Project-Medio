import React from "react";
import { cn } from "../ui/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--ds-bg-secondary)] border border-[var(--ds-border-primary)] rounded-[var(--ds-radius-2xl)] shadow-[var(--ds-shadow-md)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-[var(--ds-border-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn("px-5 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-4 border-t border-[var(--ds-border-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
