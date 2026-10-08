import { useMemo } from 'react';
import { usePreferences } from '../stores/PreferencesStore';

export function useDateFormat() {
  const { locale } = usePreferences();
  return useMemo(() => new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }), [locale]);
}
