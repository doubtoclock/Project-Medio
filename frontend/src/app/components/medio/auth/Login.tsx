import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { apiClient } from "../../../lib/apiClient";
import { useAuth } from "../../../lib/auth/AuthContext";
import { getBackendUrl } from "../../../lib/backend";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../ui/input-otp";

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

const getCapacitor = () => (window as CapacitorWindow).Capacitor;

const isCapacitor = typeof getCapacitor()?.isNativePlatform === "function"
  && Boolean(getCapacitor()?.isNativePlatform?.());

const isUserCancelledError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "USER_CANCELLED";

type OtpStep = "idle" | "sent" | "loading" | "error" | "success";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [params] = useSearchParams();
  const isSuccess = params.get("login") === "success";
  const initRef = useRef(false);

  // Google loading state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState(false);

  // OTP state
  const [otpStep, setOtpStep] = useState<OtpStep>("idle");
  const [email, setEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  // Initialize native Google auth once on mount
  useEffect(() => {
    if (!isCapacitor || initRef.current) return;
    initRef.current = true;
    SocialLogin.initialize({
      google: {
        webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || "943070343124-rnkq374mo63g67qoet5e14d6jf6e8cjv.apps.googleusercontent.com",
      },
    }).catch(() => {});
  }, []);

  // Capture token from URL (set by backend after OAuth callback)
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

  // If user already authenticated → go to /meet
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/meet", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError(false);

    if (isCapacitor) {
      try {
        const res = await SocialLogin.login({
          provider: "google",
          options: {},
        });
        if (res.provider !== "google") return;
        const { idToken } = res.result as { idToken: string | null };
        if (!idToken) return;

        const data = await apiClient.auth.nativeLogin(idToken);
        if (data.token) {
          login(data.token);
          navigate("/meet", { replace: true });
        }
      } catch (error: unknown) {
        if (!isUserCancelledError(error)) {
          console.error("Google sign-in failed", error);
          setGoogleError(true);
        }
      } finally {
        setGoogleLoading(false);
      }
    } else {
      window.location.href = `${getBackendUrl()}/api/auth/google`;
    }
  };

  const handleContinue = () => {
    login("otp-simulated-token");
    navigate("/meet", { replace: true });
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    <>
      <style>{`
        @keyframes ds-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ds-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ds-scale-check {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes ds-check-draw {
          from { stroke-dashoffset: 24; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ds-shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          50%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
        }
        .login-enter {
          animation: ds-fade-up 0.6s var(--ds-ease-out) both;
        }
        .login-enter-d1 { animation-delay: 0.05s; }
        .login-enter-d2 { animation-delay: 0.15s; }
        .login-enter-d3 { animation-delay: 0.25s; }
        .login-enter-d4 { animation-delay: 0.35s; }
        .login-enter-d5 { animation-delay: 0.45s; }
        .login-stagger {
          animation: ds-fade-in 0.35s var(--ds-ease-out) both;
        }
        .otp-shake {
          animation: ds-shake 0.4s var(--ds-ease-out);
        }
        .check-circle {
          animation: ds-scale-check 0.5s var(--ds-ease-spring) both;
        }
        .check-path {
          stroke-dasharray: 24;
          animation: ds-check-draw 0.4s var(--ds-ease-out) 0.3s both;
        }
      `}</style>

      <div
        className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
        style={{
          backgroundColor: "var(--ds-bg-primary)",
          fontFamily: "var(--ds-font-sans)",
        }}
      >
        {/* Ambient background glow */}
        <div
          className="absolute top-[-12%] left-[-8%] w-[45%] aspect-square rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-12%] right-[-8%] w-[45%] aspect-square rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)",
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Card */}
        <div
          className="relative z-10 w-full max-w-[420px] login-enter login-enter-d1"
        >
          <div
            className="ds-glass-strong rounded-[var(--ds-radius-3xl)] p-7 sm:p-9 flex flex-col gap-7"
            style={{
              boxShadow: "var(--ds-shadow-2xl)",
            }}
          >
            {/* ------ SUCCESS state ------ */}
            {isSuccess || otpStep === "success" ? (
              <div className="flex flex-col items-center gap-5 text-center login-enter login-enter-d2">
                <div
                  className="check-circle size-16 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--ds-success-soft)",
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <svg
                    className="size-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "var(--ds-success)" }}
                  >
                    <path className="check-path" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h1
                    className="text-2xl font-[var(--ds-weight-bold)]"
                    style={{ color: "var(--ds-text-primary)" }}
                  >
                    {otpStep === "success" ? "Welcome to MEDIO" : "Logged in successfully"}
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "var(--ds-text-tertiary)" }}
                  >
                    {otpStep === "success"
                      ? "You've been verified. Let's hit the road."
                      : "Welcome to MEDIO"}
                  </p>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full h-11 rounded-[var(--ds-radius-xl)] font-[var(--ds-weight-semibold)] text-sm transition-all duration-[var(--ds-duration-normal)] hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--ds-accent)",
                    color: "var(--ds-accent-text)",
                    boxShadow: "var(--ds-shadow-glow-sm)",
                  }}
                >
                  Continue
                </button>
              </div>

            ) : (
              <>
                {/* ------ Header ------ */}
                <div className="flex flex-col items-center gap-3 text-center login-enter login-enter-d2">
                  {/* Logo icon */}
                  <div
                    className="size-14 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--ds-accent-soft)",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--ds-accent)" }}
                    >
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <p
                      className="text-xs font-[var(--ds-weight-bold)] tracking-[var(--ds-tracking-widest)] uppercase"
                      style={{ color: "var(--ds-accent)" }}
                    >
                      MEDIO
                    </p>
                    <h1
                      className="text-[28px] font-[var(--ds-weight-bold)] tracking-[var(--ds-tracking-tight)]"
                      style={{ color: "var(--ds-text-primary)" }}
                    >
                      Welcome Back
                    </h1>
                    <p
                      className="text-sm"
                      style={{ color: "var(--ds-text-tertiary)" }}
                    >
                      Sign in to access your travel dashboard
                    </p>
                  </div>
                </div>

                {/* ------ Google Login Button ------ */}
                <div className="flex flex-col gap-2 login-enter login-enter-d3">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="ds-focus-ring relative w-full h-12 flex items-center justify-center gap-3 rounded-[var(--ds-radius-xl)] font-[var(--ds-weight-medium)] text-sm transition-all duration-[var(--ds-duration-normal)] active:scale-[0.98] overflow-hidden"
                    style={{
                      backgroundColor: googleLoading
                        ? "var(--ds-bg-tertiary)"
                        : "rgba(255,255,255,0.06)",
                      border: "1px solid var(--ds-border-secondary)",
                      color: "var(--ds-text-primary)",
                      opacity: googleLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!googleLoading) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!googleLoading) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                      }
                    }}
                  >
                    {googleLoading ? (
                      <span
                        className="size-5 rounded-full animate-spin"
                        style={{
                          border: "2px solid var(--ds-border-secondary)",
                          borderTopColor: "var(--ds-accent)",
                        }}
                      />
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
                    <p
                      className="text-xs text-center login-stagger"
                      style={{ color: "var(--ds-error-text)" }}
                    >
                      Google sign-in failed. Please try again.
                    </p>
                  )}

                  <p
                    className="text-xs text-center"
                    style={{ color: "var(--ds-text-tertiary)" }}
                  >
                    Secure login powered by Google
                  </p>
                </div>

                {/* ------ Divider ------ */}
                <div
                  className="flex items-center gap-3 login-enter login-enter-d4"
                  style={{ color: "var(--ds-text-tertiary)" }}
                >
                  <span className="flex-1 h-px" style={{ backgroundColor: "var(--ds-border-primary)" }} />
                  <span className="text-[11px] uppercase tracking-[var(--ds-tracking-wider)] font-[var(--ds-weight-medium)]">
                    or
                  </span>
                  <span className="flex-1 h-px" style={{ backgroundColor: "var(--ds-border-primary)" }} />
                </div>

                {/* ------ OTP Section ------ */}
                <div className="flex flex-col gap-4 login-enter login-enter-d5">
                  {(otpStep === "idle" || otpStep === "loading") && (
                    <>
                      {/* Email input */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          className="text-xs font-[var(--ds-weight-medium)]"
                          style={{ color: "var(--ds-text-secondary)" }}
                        >
                          Email address
                        </label>
                        <div
                          className="flex items-center gap-2 h-11 px-3.5 rounded-[var(--ds-radius-lg)] transition-all duration-[var(--ds-duration-fast)] focus-within:border-[var(--ds-accent)]"
                          style={{
                            backgroundColor: "var(--ds-bg-tertiary)",
                            border: "1px solid",
                            borderColor: otpError && otpStep !== "loading" ? "var(--ds-error)" : "var(--ds-border-primary)",
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0"
                            style={{ color: "var(--ds-text-tertiary)" }}
                          >
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                          <input
                            ref={emailRef}
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setOtpError("");
                            }}
                            disabled={otpStep === "loading"}
                            className="flex-1 bg-transparent text-sm outline-none border-none"
                            style={{
                              color: "var(--ds-text-primary)",
                            }}
                            placeholder="you@example.com"
                          />
                        </div>
                        {otpError && otpStep === "idle" && (
                          <p
                            className="text-xs otp-shake"
                            style={{ color: "var(--ds-error-text)" }}
                          >
                            {otpError}
                          </p>
                        )}
                      </div>

                      {/* Send code button */}
                      <button
                        onClick={handleSendCode}
                        disabled={otpStep === "loading" || !email}
                        className="w-full h-11 rounded-[var(--ds-radius-xl)] font-[var(--ds-weight-semibold)] text-sm transition-all duration-[var(--ds-duration-normal)] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--ds-accent)",
                          color: "var(--ds-accent-text)",
                          boxShadow: "var(--ds-shadow-glow-sm)",
                        }}
                      >
                        {otpStep === "loading" ? (
                          <span className="flex items-center justify-center gap-2">
                            <span
                              className="size-4 rounded-full animate-spin"
                              style={{
                                border: "2px solid rgba(255,255,255,0.3)",
                                borderTopColor: "white",
                              }}
                            />
                            Sending code...
                          </span>
                        ) : (
                          "Send code"
                        )}
                      </button>
                    </>
                  )}

                  {otpStep === "sent" && (
                    <div className="flex flex-col gap-4 login-stagger">
                      <div className="flex flex-col gap-1">
                        <p
                          className="text-sm font-[var(--ds-weight-medium)]"
                          style={{ color: "var(--ds-text-primary)" }}
                        >
                          Enter verification code
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--ds-text-tertiary)" }}
                        >
                          We sent a 6-digit code to <strong style={{ color: "var(--ds-text-secondary)" }}>{email}</strong>
                        </p>
                      </div>

                      {/* OTP Input */}
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpValue}
                          onChange={(value) => {
                            setOtpValue(value);
                            setOtpError("");
                          }}
                          containerClassName="gap-2"
                        >
                          <InputOTPGroup className="gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="!size-11 !rounded-[var(--ds-radius-lg)] !text-base !font-[var(--ds-weight-semibold)] !border !transition-all !duration-[var(--ds-duration-fast)]"
                                style={{
                                  backgroundColor: "var(--ds-bg-tertiary)",
                                  borderColor: otpError ? "var(--ds-error)" : "var(--ds-border-primary)",
                                  color: "var(--ds-text-primary)",
                                } as React.CSSProperties}
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      {otpError && (
                        <p
                          className="text-xs text-center otp-shake"
                          style={{ color: "var(--ds-error-text)" }}
                        >
                          {otpError}
                        </p>
                      )}

                      {/* Verify button */}
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpValue.length < 6}
                        className="w-full h-11 rounded-[var(--ds-radius-xl)] font-[var(--ds-weight-semibold)] text-sm transition-all duration-[var(--ds-duration-normal)] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--ds-accent)",
                          color: "var(--ds-accent-text)",
                          boxShadow: "var(--ds-shadow-glow-sm)",
                        }}
                      >
                        Verify
                      </button>

                      {/* Resend / Back */}
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <span style={{ color: "var(--ds-text-tertiary)" }}>
                          Didn't receive the code?
                        </span>
                        <button
                          onClick={handleRetryOtp}
                          className="font-[var(--ds-weight-semibold)] transition-colors hover:opacity-80"
                          style={{ color: "var(--ds-accent)" }}
                        >
                          Send again
                        </button>
                      </div>
                    </div>
                  )}

                  {otpStep === "loading" && otpValue && (
                    <div className="flex items-center justify-center py-4 login-stagger">
                      <span
                        className="size-6 rounded-full animate-spin"
                        style={{
                          border: "2px solid var(--ds-border-primary)",
                          borderTopColor: "var(--ds-accent)",
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
