import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../lib/auth/AuthContext";
import { Button } from "../../design/Button";

const SESSION_TIMEOUT_MS = 10_000;

export const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, isLoading, refresh } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, SESSION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && timedOut) {
    return (
      <div
        className="ds-flex-center min-h-screen"
        style={{ backgroundColor: "var(--ds-bg-primary)" }}
      >
        <div className="flex flex-col items-center gap-4 px-6 text-center max-w-sm">
          <div
            className="size-12 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
            style={{ backgroundColor: "var(--ds-warning-soft)" }}
          >
            <span className="text-lg" style={{ color: "var(--ds-warning)" }}>
              !
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p
              className="text-sm font-[var(--ds-weight-semibold)]"
              style={{ color: "var(--ds-text-primary)" }}
            >
              Session check timed out
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--ds-text-tertiary)" }}
            >
              Could not verify your session. Please try again.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTimedOut(false);
              refresh();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="ds-flex-center min-h-screen"
        style={{ backgroundColor: "var(--ds-bg-primary)" }}
      >
        <div
          className="size-8 rounded-full animate-spin"
          style={{
            border: "3px solid var(--ds-border-primary)",
            borderTopColor: "var(--ds-accent)",
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
