import type { Locale } from '../stores/PreferencesStore';

// Fixed categories are stored by a stable key (it must match server/config/defaultCategories.js)
// and shown in the language of the interface.
export const DEFAULT_CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  warranty: { en: 'Warranty', he: 'אחריות' },
  receipt: { en: 'Receipt', he: 'קבלה' },
  password: { en: 'Password', he: 'סיסמה' },
  insurance: { en: 'Insurance', he: 'ביטוח' },
  medical: { en: 'Medical', he: 'רפואי' },
  car: { en: 'Car', he: 'רכב' },
  home: { en: 'Home', he: 'דירה' },
  bills: { en: 'Bills', he: 'חשבונות' },
  official: { en: 'Official documents', he: 'מסמכים רשמיים' },
};

export const OTHER_CATEGORY_LABEL: Record<Locale, string> = {
  en: 'Other…',
  he: 'אחר…',
};

// Text to show for a stored category name. Custom categories are shown as typed.
export function categoryLabel(name: string, locale: Locale): string {
  return DEFAULT_CATEGORY_LABELS[name]?.[locale] ?? name;
}

// Finds an existing category the typed text refers to (by stored name or by any language's label,
// ignoring case), so typing "Warranty" or "אחריות" never creates a duplicate of the fixed category.
export function findCategoryName(typed: string, names: string[]): string | undefined {
  const wanted = typed.trim().toLowerCase();
  return names.find((name) => {
    if (name.toLowerCase() === wanted) return true;
    const labels = DEFAULT_CATEGORY_LABELS[name];
    return labels ? Object.values(labels).some((label) => label.toLowerCase() === wanted) : false;
  });
}