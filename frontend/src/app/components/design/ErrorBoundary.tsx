import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="ds-flex-center min-h-screen"
          style={{ backgroundColor: "var(--ds-bg-primary)" }}
        >
          <div className="flex flex-col items-center gap-5 px-6 text-center max-w-sm">
            <div
              className="size-14 rounded-[var(--ds-radius-2xl)] flex items-center justify-center"
              style={{ backgroundColor: "var(--ds-error-soft)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--ds-error)" }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div className="flex flex-col gap-1">
              <h1
                className="text-lg font-[var(--ds-weight-semibold)]"
                style={{ color: "var(--ds-text-primary)" }}
              >
                Something went wrong
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--ds-text-tertiary)" }}
              >
                An unexpected error occurred. You can try again or reload the application.
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button variant="secondary" size="md" fullWidth onClick={this.handleReload}>
                Reload App
              </Button>
              <Button variant="primary" size="md" fullWidth onClick={this.handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
