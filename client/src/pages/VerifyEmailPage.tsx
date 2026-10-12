import { useEffect, useRef, useState } from "react";
import { Archive, Box, MailX } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { verificationMessages } from "../features/auth/verificationMessages";
import { usePreferences } from "../stores/PreferencesStore";
import { PreferenceControls } from "../components/PreferenceControls";

export function VerifyEmailPage() {
  const { verifyEmail } = useAuth();
  const { t, locale } = usePreferences();
  const text = verificationMessages[locale];
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setFailed(true);
      return;
    }
    verifyEmail(token)
      .then(() => navigate("/items", { replace: true }))
      .catch(() => setFailed(true));
  }, [token, verifyEmail, navigate]);

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
          {failed ? (
            <>
              <p className="eyebrow">{t("brand")}</p>
              <h2>
                <MailX size={32} aria-hidden="true" /> {text.verifyFailedTitle}
              </h2>
              <p className="muted">{text.verifyFailedBody}</p>
              <p className="auth-switch">
                <Link to="/login">{text.backToSignIn}</Link>
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">{t("brand")}</p>
              <h2>{text.verifying}</h2>
            </>
          )}
        </div>
        <span className="auth-caption">{t("privateByDesign")}</span>
      </section>
    </main>
  );
}
