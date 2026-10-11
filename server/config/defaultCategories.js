// Fixed categories every user gets, stored by a stable key.
// The text shown to the user lives in client/src/utils/categories.ts — keep both lists in sync.
// Order here is the order they appear in the sidebar.
export const DEFAULT_CATEGORIES = [
  'warranty',
  'receipt',
  'password',
  'insurance',
  'medical',
  'car',
  'home',
  'bills',
  'official',
];

// An earlier version seeded these Hebrew names. They are migrated to the keys above.
export const LEGACY_DEFAULT_NAMES = {
  'אחריות': 'warranty',
  'קבלה': 'receipt',
  'סיסמא': 'password',
  'ביטוח': 'insurance',
  'רפואי': 'medical',
  'רכב': 'car',
  'דירה': 'home',
  'חשבונות': 'bills',
  'מסמכים רשמיים': 'official',
};