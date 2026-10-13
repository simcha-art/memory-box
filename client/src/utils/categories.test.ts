import { describe, expect, it } from 'vitest';
import { categoryLabel, findCategoryName } from './categories';

describe('category utilities', () => {
  it('translates default categories and preserves custom names', () => {
    expect(categoryLabel('warranty', 'en')).toBe('Warranty');
    expect(categoryLabel('warranty', 'he')).toBe('אחריות');
    expect(categoryLabel('Custom', 'en')).toBe('Custom');
  });

  it('finds category names using trimmed case-insensitive names and translations', () => {
    expect(findCategoryName('  TRAVEL ', ['Travel', 'Home'])).toBe('Travel');
    expect(findCategoryName('אחריות', ['warranty', 'home'])).toBe('warranty');
    expect(findCategoryName('missing', ['Home'])).toBeUndefined();
  });
});
