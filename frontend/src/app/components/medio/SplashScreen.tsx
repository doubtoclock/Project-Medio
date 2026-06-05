import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";

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
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const destinationRef = useRef("/login");

  useEffect(() => {
    const startTime = performance.now();
    let isMounted = true;

    apiFetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        destinationRef.current = data?.authenticated ? "/meet" : "/login";
      })
      .catch(() => {
        destinationRef.current = "/login";
      });

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
      isMounted = false;
      window.clearInterval(frame);
    };
  }, [navigate]);

  const currentStage = loadingStages[currentStageIndex];

  return (
    <div className="min-h-screen overflow-hidden bg-background-light font-display text-slate-900 antialiased dark:bg-background-dark dark:text-slate-100">
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background-light px-4 py-6 dark:bg-background-dark sm:px-6 sm:py-10">
        <div className="absolute inset-0 topo-pattern pointer-events-none"></div>
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary/10 blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-[140px]"></div>

        <div className="relative z-10 w-full max-w-md space-y-4">
          <div
            className="relative min-h-[300px] overflow-hidden rounded-[28px] border border-slate-800/50 bg-background-dark/60 bg-cover bg-center shadow-2xl"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD8PURMlKKo0au4r1BWDXBuqjSV7Gx-i_Ye4hzikb6m9VlmOSliLxXyxRyXrjA3zgBRWxdROlmTPnVb3ceLsPVPa2bk_hJQ54FxRXbNglMsj0xCQ3f36GYK5LtlTPi9l1Rwbl3Hdb1dSOcIWuTcBq6QLe-lRXQ-A00WWLuietoSsqWgfIBeiOpFqepJjGisZIm9sVKC35fUxg7nu9zHT7LHC_Zk5xV1wx8XIC2ZryfTj_e10UVEn-50gxx8BThvWYjA4RLnK0Ise4Q")',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950/20 via-slate-950/35 to-slate-950/90"></div>
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>

            <div className="relative flex min-h-[300px] flex-col justify-end p-5 sm:p-7">
              <div className="mb-4 inline-flex w-fit items-center rounded-full border border-cyan-400/20 bg-slate-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-cyan-200 sm:text-[11px]">
                Live Route Bootstrap
              </div>

              <div className="max-w-sm">
                <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-slate-400 sm:text-xs sm:tracking-[0.35em]">
                  Smart Meeting Point Finder
                </p>
                <h1 className="glow-effect text-[40px] font-bold tracking-[0.18em] text-white sm:text-5xl sm:tracking-[0.22em]">
                  MEDIO
                </h1>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/78 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.28em] text-primary/80">
                  System Startup
                </p>
                <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  Preparing your travel workspace
                </h2>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300">
                  Progress
                </p>
                <p className="text-xl font-semibold text-primary sm:text-2xl">
                  {Math.round(progress)}%
                </p>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.28em]">
              <span className="max-w-[70%] truncate">{currentStage.label}</span>
              <span>Node active</span>
            </div>

            <div className="relative mb-3 h-2.5 overflow-hidden rounded-full bg-slate-800/80">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,108,242,0.08),rgba(34,211,238,0.18),rgba(13,108,242,0.08))]"></div>
              <div
                className="relative h-full rounded-full bg-[linear-gradient(90deg,#0d6cf2_0%,#2dd4bf_55%,#7dd3fc_100%)] shadow-[0_0_24px_rgba(13,108,242,0.65)] transition-[width] duration-200 ease-out"
                style={{ width: `${progress}%` }}
              >
                <span className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/3 rounded-full bg-cyan-200/90 blur-[2px]"></span>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              {currentStage.detail}
            </p>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.26em] text-slate-500 sm:text-[11px] sm:tracking-[0.3em]">
              <span>Global network node</span>
              <span>v2.4.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
