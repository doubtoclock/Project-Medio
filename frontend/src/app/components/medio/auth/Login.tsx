import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, setAuthToken } from "../../../lib/api";
import { getBackendUrl } from "../../../lib/backend";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isSuccess = params.get("login") === "success";

  // Save token from OAuth redirect
  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setAuthToken(token);
      navigate("/login", { replace: true });
    }
  }, [params, navigate]);

  // If user already authenticated → go to /meet
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((res) => res.json())
      .then((res) => {
        if (res?.authenticated) {
          navigate("/meet", { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${getBackendUrl()}/api/auth/google`;
  };

  const handleContinue = () => {
    navigate("/meet", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 p-4 relative overflow-hidden">

      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />

      {/* Login card */}
      <div className="relative w-full max-w-[440px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-8 flex flex-col space-y-8 text-center">

        {!isSuccess ? (
          <>
            {/* Header */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-4xl">
                  explore
                </span>
              </div>

              <h2 className="text-primary text-sm font-bold tracking-[0.2em] uppercase">
                MEDIO
              </h2>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome Back
              </h1>

              <p className="text-slate-500 dark:text-slate-400 text-base">
                Sign in to access your travel dashboard
              </p>
            </div>

            {/* Google login button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full h-14 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google logo"
                className="w-5 h-5"
              />
              <span>Continue with Google</span>
            </button>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Secure login powered by Google
            </p>
          </>
        ) : (
          <>
            {/* Success UI */}
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Logged in successfully
            </h1>

            <p className="text-slate-500 dark:text-slate-400">
              Welcome to MEDIO
            </p>

            <button
              onClick={handleContinue}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              Continue
            </button>
          </>
        )}

      </div>
    </div>
  );
};
