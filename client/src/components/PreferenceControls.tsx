import { Languages, Moon, Sun } from 'lucide-react';
import { usePreferences } from '../stores/PreferencesStore';

export function PreferenceControls() {
  const { locale, theme, setLocale, toggleTheme, t } = usePreferences();
  return <div className="preference-controls">
    <button className="icon-button preference-button" type="button" onClick={toggleTheme} aria-label={theme === 'light' ? t('darkMode') : t('lightMode')} title={theme === 'light' ? t('darkMode') : t('lightMode')}>
      {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
    </button>
    <button className="language-button" type="button" onClick={() => setLocale(locale === 'en' ? 'he' : 'en')} aria-label={t('language')} title={t('language')}>
      <Languages size={16} /><span>{locale === 'en' ? t('hebrew') : t('english')}</span>
    </button>
  </div>;
}
