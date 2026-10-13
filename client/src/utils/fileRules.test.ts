import { describe, expect, it } from 'vitest';
import {
  acceptFor,
  fileAllowed,
  fileNameAllowed,
  formatLabelFor,
  inputKindFor,
  MAX_FILE_BYTES,
} from './fileRules';

describe('file rules', () => {
  it('selects the correct input for each item type', () => {
    expect(inputKindFor('Document')).toBe('file');
    expect(inputKindFor('Receipt')).toBe('file');
    expect(inputKindFor('Image')).toBe('file');
    expect(inputKindFor('Link')).toBe('link');
    expect(inputKindFor('Password')).toBe('password');
    expect(inputKindFor('Note')).toBe('none');
  });

  it('advertises allowed formats for the selected type', () => {
    expect(acceptFor('Document')).toContain('.pdf');
    expect(acceptFor('Document')).toContain('.docx');
    expect(acceptFor('Document')).not.toContain('.png');
    expect(formatLabelFor('Image')).toBe('JPG, PNG, WEBP');
    expect(acceptFor('Note')).toBe('');
  });

  it('validates extensions case-insensitively and disallows files for non-file types', () => {
    expect(fileNameAllowed('Image', 'PHOTO.JPEG')).toBe(true);
    expect(fileNameAllowed('Document', 'scan.png')).toBe(false);
    expect(fileNameAllowed('Receipt', 'receipt.webp')).toBe(true);
    expect(fileNameAllowed('Note', 'note.pdf')).toBe(false);
    expect(fileAllowed('Image', new File(['image'], 'image.png'))).toBe(true);
    expect(fileAllowed('Image', new File(['image'], 'image.gif'))).toBe(false);
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
  });
});
