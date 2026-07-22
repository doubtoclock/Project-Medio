import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBackendUrl } from "../lib/backend";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [params] = useSearchParams();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalError, setLegalError] = useState("");

  useEffect(() => {
    const urlToken = params.get("token");
    if (urlToken) {
      login(urlToken);
      const cleaned = new URLSearchParams(params);
      cleaned.delete("token");
      const search = cleaned.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (search ? `?${search}` : "")
      );
      navigate("/meet", { replace: true });
    }
  }, [params, navigate, login]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/meet", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    if (!legalAccepted) {
      setLegalError("Please accept the Privacy Policy and Terms & Conditions");
      return;
    }
    setGoogleLoading(true);
    setGoogleError(false);
    // Preserve the local app URL through the OAuth round trip.
    const returnUrl = new URL("/login", window.location.origin).toString();
    window.location.href = `${getBackendUrl()}/api/auth/google?redirect=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow top-left" />
      <div className="login-bg-glow bottom-right" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3" />
              <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
            </svg>
          </div>
          <p className="login-brand">MEDIO</p>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to access your travel dashboard</p>
        </div>

        <div className="login-section">
          <label className={`login-legal-consent ${legalError ? "has-error" : ""}`}>
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(e) => {
                setLegalAccepted(e.target.checked);
                setLegalError("");
              }}
            />
            <span>
              I agree to the{" "}
              <button type="button" onClick={() => navigate("/privacy")}>Privacy Policy</button>
              {" "}and{" "}
              <button type="button" onClick={() => navigate("/terms")}>Terms & Conditions</button>
            </span>
          </label>
          {legalError && (
            <p className="login-error-text">{legalError}</p>
          )}

          <button
            className="login-btn login-btn-google"
            onClick={handleGoogleLogin}
            disabled={googleLoading || !legalAccepted}
          >
            {googleLoading ? (
              <span className="login-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
            )}
            <span>{googleLoading ? "Signing in..." : "Continue with Google"}</span>
          </button>

          {googleError && (
            <p className="login-error-text">Google sign-in failed. Please try again.</p>
          )}

          <p className="login-secure-text">Secure login powered by Google</p>
        </div>
      </div>
    </div>
  );
}
