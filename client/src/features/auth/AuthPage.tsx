import { useState, type FormEvent } from 'react';
import { Archive, ArrowUpRight, Box } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePreferences } from '../../stores/PreferencesStore';
import { PreferenceControls } from '../../components/PreferenceControls';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { authenticate } = useAuth();
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const register = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    try {
      await authenticate(mode, values);
      navigate('/items', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('signIn'));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-layout">
    <section className="auth-visual">
      <Link className="brand auth-brand" to="/"><span className="brand-icon"><Box size={20} /></span><span>memory<span className="brand-light">box</span></span></Link>
      <div className="auth-story">
        <div className="story-kicker"><span />{t('personalArchive')}</div>
        <h1>{t('keepDetails')}</h1>
        <p>{t('authIntro')}</p>
        <div className="story-decoration" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><Archive className="orbit-icon" size={44} /></div>
      </div>
      <div className="privacy-mark"><Archive size={15} />{t('privateByDesign')}</div>
    </section>
    <section className="auth-side">
      <div className="auth-controls"><PreferenceControls /></div>
      <div className="auth-card">
        <p className="eyebrow">{t('brand')} <span>/</span> {register ? t('signUp') : t('signIn')}</p>
        <h2>{register ? t('createHeading') : t('welcome')}</h2>
        <p className="muted">{t('authIntro')}</p>
        <form className="auth-form" onSubmit={submit}>
          {register && <label>{t('name')}<input name="name" required maxLength={80} autoComplete="name" /></label>}
          <label>{t('email')}<input name="email" type="email" required autoComplete="email" /></label>
          <label>{t('password')}<input name="password" type="password" required minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? t('loadingApp') : register ? t('register') : t('signIn')}<ArrowUpRight size={17} /></button>
        </form>
        <p className="auth-switch">{register ? t('haveAccount') : t('noAccount')} <Link to={register ? '/login' : '/register'}>{register ? t('signIn') : t('signUp')}</Link></p>
      </div>
      <span className="auth-caption">{t('privateByDesign')}</span>
    </section>
  </main>;
}
