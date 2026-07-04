import { useCallback, useEffect, useState } from "react";
import { Check, Copy, QrCode, Share2, X } from "lucide-react";
import { Button } from "../design/Button";
import { IconButton } from "../design/IconButton";

interface ShareViewProps {
  open: boolean;
  placeName: string;
  onClose: () => void;
}

export function ShareView({ open, placeName, onClose }: ShareViewProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
    }
  }, [shareUrl]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--ds-z-modal)] flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--ds-overlay)" }}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Share"
    >
      <style>{`
        @keyframes share-scale-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes share-check {
          0%   { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes share-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .share-enter {
          animation: share-scale-in 0.35s var(--ds-ease-out) both;
        }
        .share-check {
          animation: share-check 0.4s var(--ds-ease-out) 0.15s both;
        }
        .share-fade-up {
          animation: share-fade-up 0.3s var(--ds-ease-out) both;
        }
      `}</style>

      <div
        className="share-enter relative w-full max-w-sm rounded-[var(--ds-radius-2xl)] overflow-hidden"
        style={{
          backgroundColor: "var(--ds-bg-secondary)",
          border: "1px solid var(--ds-border-primary)",
          boxShadow: "var(--ds-shadow-2xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-x-0 top-0 h-32 opacity-[0.06] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, var(--ds-accent) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-primary)" }}>
              Share
            </h2>
            <IconButton variant="ghost" size="sm" label="Close" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </div>

          {/* Place name */}
          <div className="share-fade-up mb-5 text-center">
            <p className="text-sm" style={{ color: "var(--ds-text-tertiary)" }}>
              {placeName}
            </p>
          </div>

          {/* QR code placeholder */}
          <div className="share-fade-up flex justify-center mb-5" style={{ animationDelay: "0.05s" }}>
            <div
              className="size-40 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
              style={{
                backgroundColor: "var(--ds-bg-tertiary)",
                border: "1px solid var(--ds-border-primary)",
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <QrCode size={48} style={{ color: "var(--ds-text-secondary)" }} />
                <span className="text-[10px] font-[var(--ds-weight-medium)]" style={{ color: "var(--ds-text-tertiary)" }}>
                  Scan to view
                </span>
              </div>
            </div>
          </div>

          {/* Copy link */}
          <div className="share-fade-up" style={{ animationDelay: "0.1s" }}>
            <div
              className="flex items-center gap-2 rounded-[var(--ds-radius-lg)] p-1"
              style={{
                backgroundColor: "var(--ds-bg-tertiary)",
                border: "1px solid var(--ds-border-primary)",
              }}
            >
              <div className="flex-1 min-w-0 px-3 py-2 truncate text-xs" style={{ color: "var(--ds-text-secondary)" }}>
                {shareUrl || "https://medio.app/..."}
              </div>
              <button
                onClick={handleCopyLink}
                className="shrink-0 size-9 rounded-[var(--ds-radius-md)] flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: copied ? "var(--ds-success-soft)" : "var(--ds-bg-hover)",
                  color: copied ? "var(--ds-success)" : "var(--ds-text-secondary)",
                }}
                aria-label={copied ? "Copied" : "Copy link"}
              >
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              </button>
            </div>
            {copied && (
              <p className="text-xs mt-1.5 text-center share-fade-up" style={{ color: "var(--ds-success-text)" }}>
                Link copied to clipboard
              </p>
            )}
          </div>

          {/* Share button */}
          <div className="share-fade-up mt-5" style={{ animationDelay: "0.15s" }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({ title: placeName, url: shareUrl });
                } else {
                  handleCopyLink();
                }
              }}
            >
              <Share2 size={16} />
              Share with friends
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
