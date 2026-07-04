import { useEffect, useRef, useState } from "react";
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

  const [otpStep, setOtpStep] = useState("idle");
  const [email, setEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const emailRef = useRef(null);

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
    setGoogleLoading(true);
    setGoogleError(false);
    window.location.href = `${getBackendUrl()}/api/auth/google`;
  };

  const handleContinue = () => {
    login("otp-simulated-token");
    navigate("/meet", { replace: true });
  };

  const timerRef = useRef(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSendCode = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setOtpError("Please enter a valid email address");
      return;
    }
    setOtpError("");
    setOtpStep("loading");
    timerRef.current = setTimeout(() => {
      setOtpStep("sent");
      setOtpValue("");
    }, 1200);
  };

  const handleVerifyOtp = () => {
    if (otpValue.length < 6) {
      setOtpError("Please enter the full 6-digit code");
      return;
    }
    setOtpStep("loading");
    setOtpError("");
    timerRef.current = setTimeout(() => {
      setOtpStep("success");
    }, 1500);
  };

  const handleRetryOtp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOtpStep("idle");
    setOtpValue("");
    setOtpError("");
    setEmail("");
  };

  return (
    <div className="login-page">
      <div className="login-bg-glow top-left" />
      <div className="login-bg-glow bottom-right" />

      <div className="login-card">
        {otpStep === "success" ? (
          <div className="login-success">
            <div className="login-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="login-success-title">Welcome to MEDIO</h1>
            <p className="login-success-subtitle">You've been verified. Let's hit the road.</p>
            <button className="login-btn login-btn-primary" onClick={handleContinue}>
              Continue
            </button>
          </div>
        ) : (
          <>
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
              <button
                className="login-btn login-btn-google"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
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

            <div className="login-divider">
              <span className="login-divider-line" />
              <span className="login-divider-text">or</span>
              <span className="login-divider-line" />
            </div>

            <div className="login-section">
              {(otpStep === "idle" || otpStep === "loading") && (
                <>
                  <div className="login-field">
                    <label className="login-label">Email address</label>
                    <div className={`login-input-wrapper ${otpError && otpStep === "idle" ? "has-error" : ""}`}>
                      <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setOtpError(""); }}
                        disabled={otpStep === "loading"}
                        className="login-input"
                        placeholder="you@example.com"
                      />
                    </div>
                    {otpError && otpStep === "idle" && (
                      <p className="login-error-text">{otpError}</p>
                    )}
                  </div>

                  <button
                    className="login-btn login-btn-primary"
                    onClick={handleSendCode}
                    disabled={otpStep === "loading" || !email}
                  >
                    {otpStep === "loading" ? (
                      <span className="login-btn-loading">
                        <span className="login-spinner white" />
                        Sending code...
                      </span>
                    ) : (
                      "Send code"
                    )}
                  </button>
                </>
              )}

              {otpStep === "sent" && (
                <div className="login-otp-section">
                  <p className="login-otp-label">Enter verification code</p>
                  <p className="login-otp-desc">
                    We sent a 6-digit code to <strong>{email}</strong>
                  </p>

                  <div className="login-otp-inputs">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpValue[index] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (!val && index > 0) {
                            const prev = document.querySelector(`.otp-slot-${index - 1}`);
                            prev?.focus();
                          }
                          const newOtp = otpValue.split("");
                          newOtp[index] = val;
                          setOtpValue(newOtp.join(""));
                          setOtpError("");
                          if (val && index < 5) {
                            const next = document.querySelector(`.otp-slot-${index + 1}`);
                            next?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otpValue[index] && index > 0) {
                            const prev = document.querySelector(`.otp-slot-${index - 1}`);
                            prev?.focus();
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className={`login-otp-slot otp-slot-${index}`}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="login-error-text">{otpError}</p>
                  )}

                  <button
                    className="login-btn login-btn-primary"
                    onClick={handleVerifyOtp}
                    disabled={otpValue.length < 6}
                  >
                    Verify
                  </button>

                  <div className="login-otp-resend">
                    <span>Didn't receive the code?</span>
                    <button onClick={handleRetryOtp}>Send again</button>
                  </div>
                </div>
              )}

              {otpStep === "loading" && otpValue && (
                <div className="login-otp-loading">
                  <span className="login-spinner" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
