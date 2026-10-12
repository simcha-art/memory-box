import type { RepeatType } from '../../types';

export const REPEAT_OPTIONS: RepeatType[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

export const repeatMessages = {
  en: {
    label: 'Repeat',
    none: 'Does not repeat',
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
    yearly: 'Every year',
  },
  he: {
    label: 'חזרה',
    none: 'ללא חזרה',
    daily: 'כל יום',
    weekly: 'כל שבוע',
    monthly: 'כל חודש',
    yearly: 'כל שנה',
  },
};