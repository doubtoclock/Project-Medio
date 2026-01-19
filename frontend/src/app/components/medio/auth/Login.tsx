import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export const LoginPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isSuccess = params.get("login") === "success";

  // 🔐 If already logged in, go directly to /meet
  useEffect(() => {
    fetch("http://localhost:5000/api/auth/me", {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          navigate("/meet", { replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  const handleContinue = () => {
    navigate("/meet", { replace: true });
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-6">
      <div className="w-full max-w-sm bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl shadow-2xl p-8 text-white text-center">

        {!isSuccess ? (
          <>
            {/* LOGIN UI */}
            <h1 className="text-3xl font-black italic mb-1">MEDIO</h1>
            <p className="text-sm text-zinc-400 mb-10">
              Sign in to continue
            </p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 
                         border border-zinc-800 py-4 rounded-xl 
                         hover:bg-zinc-800/40 active:scale-[0.98] transition-all"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-sm font-semibold">
                Continue with Google
              </span>
            </button>

            <p className="mt-6 text-xs text-zinc-500">
              We only use Google to identify you.
            </p>
          </>
        ) : (
          <>
            {/* SUCCESS UI */}
            <div className="flex justify-center mb-6">
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

            <h1 className="text-2xl font-black italic mb-2">
              Logged in successfully
            </h1>

            <p className="text-sm text-zinc-400 mb-8">
              Welcome to MEDIO
            </p>

            {/* CONTINUE BUTTON */}
            <button
              onClick={handleContinue}
              className="
                w-full py-3 rounded-xl 
                bg-emerald-500/90 text-black font-semibold
                hover:bg-emerald-500 
                active:scale-[0.98] transition-all
              "
            >
              Continue
            </button>
          </>
        )}

      </div>
    </div>
  );
};
