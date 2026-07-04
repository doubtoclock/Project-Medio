import React from "react";
import { cn } from "../ui/utils";

type LoadingSize = "sm" | "md" | "lg";

interface LoadingProps {
  size?: LoadingSize;
  className?: string;
}

const sizeStyles: Record<LoadingSize, string> = {
  sm: "size-4 border-2",
  md: "size-8 border-[3px]",
  lg: "size-12 border-4",
};

export function Loading({ size = "md", className }: LoadingProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-[var(--ds-border-primary)] border-t-[var(--ds-accent)]",
        sizeStyles[size],
        className,
      )}
    />
  );
}

// ---- Skeleton ----

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--ds-radius-md)] bg-[var(--ds-bg-tertiary)]",
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

// ---- Spinner page overlay ----

export function LoadingPage({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="ds-flex-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Loading size="lg" />
        <p className="text-[var(--ds-text-sm)] text-[var(--ds-text-tertiary)]">
          {label}
        </p>
      </div>
    </div>
  );
}
