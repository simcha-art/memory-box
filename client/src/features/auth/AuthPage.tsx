import { useEffect, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowUpRight,
  Box,
  Eye,
  EyeOff,
  MailCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useAuth } from "./AuthContext";
import { verificationMessages } from "./verificationMessages";
import { usePreferences } from "../../stores/PreferencesStore";
import { PreferenceControls } from "../../components/PreferenceControls";
import { PopupNotice } from "../../components/PopupNotice";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { authenticate, resendVerification } = useAuth();
  const { t, locale } = usePreferences();
  const text = verificationMessages[locale];
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const register = mode === "register";

  useEffect(() => {
    setError("");
    setInfo("");
    setPendingEmail(null);
    setUnverifiedEmail(null);
    setShowPassword(false);
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setUnverifiedEmail(null);
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    ) as Record<string, string>;
    if (register) {
      if (values.password !== values.confirmPassword) {
        setError(text.passwordsMismatch);
        return;
      }
      delete values.confirmPassword;
    }
    setSubmitting(true);
    try {
      const result = await authenticate(mode, values);
      if (result === "verification-sent") {
        setPendingEmail(values.email);
        return;
      }
      navigate("/items", { replace: true });
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email);
        setError(text.notVerified);
      } else {
        setError(reason instanceof Error ? reason.message : t("signIn"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(email: string | null) {
    if (!email) return;
    setError("");
    setInfo("");
    setResending(true);
    try {
      await resendVerification(email);
      setInfo(text.resendDone);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.notVerified);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <Link className="brand auth-brand" to="/">
          <span className="brand-icon">
            <Box size={20} />
          </span>
          <span>
            memory<span className="brand-light">box</span>
          </span>
        </Link>
        <div className="auth-story">
          <div className="story-kicker">
            <span />
            {t("personalArchive")}
          </div>
          <h1>{t("keepDetails")}</h1>
          <p>{t("authIntro")}</p>
          <div className="story-decoration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <Archive className="orbit-icon" size={44} />
          </div>
        </div>
        <div className="privacy-mark">
          <Archive size={15} />
          {t("privateByDesign")}
        </div>
      </section>
      <section className="auth-side">
        <div className="auth-controls">
          <PreferenceControls />
        </div>
        <div className="auth-card">
          {pendingEmail ? (
            <>
              <p className="eyebrow">
                {t("brand")} <span>/</span> {t("signUp")}
              </p>
              <h2>
                <MailCheck size={32} aria-hidden="true" />{" "}
                {text.checkInboxTitle}
              </h2>
              <p className="muted">{text.checkInboxBody(pendingEmail)}</p>
              <p className="muted">{text.checkInboxHint}</p>
              <button
                className="button button-primary auth-submit"
                type="button"
                disabled={resending}
                onClick={() => resend(pendingEmail)}
              >
                {text.resend}
                <ArrowUpRight size={17} />
              </button>
              <p className="auth-switch">
                <Link to="/login">{text.backToSignIn}</Link>
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">
                {t("brand")} <span>/</span>{" "}
                {register ? t("signUp") : t("signIn")}
              </p>
              <h2>{register ? t("createHeading") : t("welcome")}</h2>
              <p className="muted">{t("authIntro")}</p>
              <form className="auth-form" onSubmit={submit}>
                {register && (
                  <label>
                    {t("name")}
                    <input
                      name="name"
                      required
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>
                )}
                <label>
                  {t("email")}
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </label>
                <label>
                  {t("password")}
                  <span className="password-field">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={register ? 8 : 1}
                      autoComplete={
                        register ? "new-password" : "current-password"
                      }
                    />
                    <button
                      className="icon-button icon-button-small"
                      type="button"
                      title={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                      aria-label={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                {register && (
                  <label>
                    {text.confirmPassword}
                    <span className="password-field">
                      <input
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                      <button
                        className="icon-button icon-button-small"
                        type="button"
                        title={
                          showPassword ? t("hidePassword") : t("showPassword")
                        }
                        aria-label={
                          showPassword ? t("hidePassword") : t("showPassword")
                        }
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </span>
                  </label>
                )}
                {error && (
                  <PopupNotice message={error} onClose={() => setError("")} />
                )}
                {info && (
                  <PopupNotice
                    kind="success"
                    message={info}
                    onClose={() => setInfo("")}
                  />
                )}
                <button
                  className="button button-primary auth-submit"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? t("loadingApp")
                    : register
                      ? t("register")
                      : t("signIn")}
                  <ArrowUpRight size={17} />
                </button>
                {unverifiedEmail && (
                  <button
                    className="button"
                    type="button"
                    disabled={resending}
                    onClick={() => resend(unverifiedEmail)}
                  >
                    {text.resend}
                  </button>
                )}
              </form>
              <p className="auth-switch">
                {register ? t("haveAccount") : t("noAccount")}{" "}
                <Link to={register ? "/login" : "/register"}>
                  {register ? t("signIn") : t("signUp")}
                </Link>
              </p>
            </>
          )}
        </div>
        <span className="auth-caption">{t("privateByDesign")}</span>
      </section>
    </main>
  );
}
