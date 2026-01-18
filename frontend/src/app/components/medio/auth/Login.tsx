import React from "react";
import { useNavigate } from "react-router-dom";

export const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // 🔁 Redirect-based Google OAuth (full page)
    window.location.href =
      "http://localhost:5000/api/auth/google/redirect";
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-900 px-6">
      <div className="w-full max-w-sm bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-3xl shadow-2xl p-8 text-white text-center">

        {/* Brand */}
        <h1 className="text-3xl font-black italic mb-1">MEDIO</h1>
        <p className="text-sm text-zinc-400 mb-10">
          Sign in to continue
        </p>

        {/* Google OAuth */}
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
      </div>
    </div>
  );
};
