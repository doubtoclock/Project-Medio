import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

const SPLASH_DURATION_MS = 10000;

const loadingStages = [
  {
    label: "Booting Medio core",
    detail: "Initializing startup sequence and core services",
  },
  {
    label: "Syncing navigation data",
    detail: "Fetching route graph metadata from mobility nodes",
  },
  {
    label: "Loading geospatial resources",
    detail: "Preparing map tiles, place indexes, and cached layers",
  },
  {
    label: "Hydrating route engine",
    detail: "Warming travel-time calculations and transfer logic",
  },
  {
    label: "Establishing secure session",
    detail: "Verifying client state and encrypted app context",
  },
  {
    label: "Finalizing interface render",
    detail: "Committing UI modules and readying user workspace",
  },
];

const getProgressValue = (elapsed: number) => {
  const normalizedTime = Math.min(elapsed / SPLASH_DURATION_MS, 1);

  if (normalizedTime < 0.88) {
    const eased = 1 - Math.pow(1 - normalizedTime / 0.88, 3);
    return Math.min(96, eased * 96);
  }

  const finalStep = (normalizedTime - 0.88) / 0.12;
  return 96 + finalStep * 4;
};

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const destinationRef = useRef("/login");

  useEffect(() => {
    destinationRef.current = isAuthenticated ? "/meet" : "/login";
  }, [isAuthenticated]);

  useEffect(() => {
    const startTime = performance.now();

    const frame = window.setInterval(() => {
      const elapsed = performance.now() - startTime;
      const nextProgress = getProgressValue(elapsed);
      const stageProgress = Math.min(
        loadingStages.length - 1,
        Math.floor((elapsed / SPLASH_DURATION_MS) * loadingStages.length)
      );

      setProgress(Math.min(100, nextProgress));
      setCurrentStageIndex(stageProgress);

      if (elapsed >= SPLASH_DURATION_MS) {
        window.clearInterval(frame);
        setProgress(100);
        setCurrentStageIndex(loadingStages.length - 1);
        navigate(destinationRef.current, { replace: true });
      }
    }, 50);

    return () => {
      window.clearInterval(frame);
    };
  }, [navigate]);

  const currentStage = loadingStages[currentStageIndex];

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: "var(--ds-bg-primary)",
        fontFamily: "var(--ds-font-display)",
      }}
    >
      <style>{`
        @keyframes ds-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ds-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ds-pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes ds-progress-glow {
          0%   { box-shadow: 0 0 6px rgba(59,130,246,0.3); }
          50%  { box-shadow: 0 0 20px rgba(59,130,246,0.6); }
          100% { box-shadow: 0 0 6px rgba(59,130,246,0.3); }
        }
        @keyframes ds-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        .splash-enter {
          animation: ds-fade-up 0.7s var(--ds-ease-out) both;
        }
        .splash-enter-d1 { animation-delay: 0.1s; }
        .splash-enter-d2 { animation-delay: 0.25s; }
        .splash-enter-d3 { animation-delay: 0.4s; }
        .splash-enter-d4 { animation-delay: 0.55s; }
        .splash-stage-enter {
          animation: ds-fade-in 0.35s var(--ds-ease-out) both;
        }
      `}</style>

      {/* Ambient background glow orbs */}
      <div
        className="absolute top-[-15%] left-[-10%] w-[50%] aspect-square rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)",
          animation: "ds-float 8s var(--ds-ease-smooth) infinite",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[45%] aspect-square rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)",
          animation: "ds-float 10s var(--ds-ease-smooth) infinite reverse",
        }}
      />
      <div
        className="absolute top-[40%] right-[5%] w-[20%] aspect-square rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.06), transparent 60%)",
          animation: "ds-pulse-glow 6s var(--ds-ease-smooth) infinite",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md flex flex-col gap-4">

        {/* Hero card */}
        <div
          className="relative overflow-hidden rounded-[var(--ds-radius-3xl)] splash-enter splash-enter-d1"
          style={{
            background: "linear-gradient(135deg, var(--ds-bg-secondary), var(--ds-bg-tertiary))",
            border: "1px solid var(--ds-border-primary)",
            boxShadow: "var(--ds-shadow-2xl)",
          }}
        >
          {/* Inner glow overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.08), transparent 60%)",
            }}
          />

          <div className="relative px-6 pt-8 pb-7 sm:px-8 sm:pt-10 sm:pb-8 flex flex-col gap-5">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-[var(--ds-radius-full)]"
              style={{
                backgroundColor: "var(--ds-accent-soft)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: "var(--ds-accent)" }}
              />
              <span
                className="text-[10px] uppercase tracking-[var(--ds-tracking-widest)] font-[var(--ds-weight-semibold)]"
                style={{ color: "var(--ds-accent)" }}
              >
                Live Route Bootstrap
              </span>
            </div>

            {/* Tagline */}
            <p
              className="text-[11px] uppercase tracking-[var(--ds-tracking-wider)] sm:text-xs"
              style={{ color: "var(--ds-text-tertiary)" }}
            >
              Smart Meeting Point Finder
            </p>

            {/* Brand */}
            <h1
              className="text-[40px] font-[var(--ds-weight-bold)] tracking-[var(--ds-tracking-widest)] sm:text-5xl"
              style={{ color: "var(--ds-text-primary)" }}
            >
              MEDIO
            </h1>
          </div>
        </div>

        {/* Progress card */}
        <div
          className="ds-glass rounded-[var(--ds-radius-2xl)] p-5 sm:p-6 splash-enter splash-enter-d2"
          style={{
            boxShadow: "var(--ds-shadow-lg)",
          }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex flex-col gap-0.5">
              <p
                className="text-[10px] uppercase tracking-[var(--ds-tracking-wider)]"
                style={{ color: "var(--ds-accent)" }}
              >
                System Startup
              </p>
              <h2
                className="text-lg font-[var(--ds-weight-semibold)] sm:text-xl"
                style={{ color: "var(--ds-text-primary)" }}
              >
                Preparing your travel workspace
              </h2>
            </div>

            <div
              className="shrink-0 rounded-[var(--ds-radius-xl)] px-3 py-2 text-right"
              style={{
                backgroundColor: "var(--ds-accent-soft)",
                border: "1px solid rgba(59,130,246,0.15)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[var(--ds-tracking-wider)]"
                style={{ color: "var(--ds-text-tertiary)" }}
              >
                Progress
              </p>
              <p
                className="text-xl font-[var(--ds-weight-semibold)] sm:text-2xl"
                style={{ color: "var(--ds-accent)" }}
              >
                {Math.round(progress)}%
              </p>
            </div>
          </div>

          {/* Stage label */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <span
              key={currentStageIndex}
              className="splash-stage-enter truncate max-w-[70%] text-[10px] uppercase tracking-[var(--ds-tracking-wider)] sm:text-xs"
              style={{ color: "var(--ds-text-secondary)" }}
            >
              {currentStage.label}
            </span>
            <span
              className="text-[10px] uppercase tracking-[var(--ds-tracking-wider)] shrink-0"
              style={{ color: "var(--ds-text-tertiary)" }}
            >
              Node active
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="relative h-2 overflow-hidden rounded-full mb-3"
            style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(90deg, rgba(59,130,246,0.08), rgba(59,130,246,0.18), rgba(59,130,246,0.08))",
              }}
            />
            <div
              className="relative h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, var(--ds-accent) 0%, #60a5fa 100%)",
                boxShadow: "0 0 20px rgba(59,130,246,0.5)",
                animation: "ds-progress-glow 2s var(--ds-ease-smooth) infinite",
              }}
            />
          </div>

          {/* Stage detail */}
          <p
            key={currentStageIndex + "-detail"}
            className="splash-stage-enter text-sm"
            style={{ color: "var(--ds-text-tertiary)" }}
          >
            {currentStage.detail}
          </p>

          {/* Footer */}
          <div
            className="mt-5 flex items-center justify-between pt-4 text-[10px] uppercase tracking-[var(--ds-tracking-wider)] sm:text-[11px]"
            style={{
              borderTop: "1px solid var(--ds-border-primary)",
              color: "var(--ds-text-tertiary)",
            }}
          >
            <span>Global network node</span>
            <span>v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
