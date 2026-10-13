import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ItemsPage } from './ItemsPage';
import { PreferencesProvider } from '../stores/PreferencesStore';

const workspace = vi.hoisted(() => ({
  items: [
    {
      _id: 'item-1',
      title: 'Passport',
      description: '',
      type: 'Document',
      category: 'Travel',
      url: '',
      username: '',
      hasPassword: false,
      tags: ['travel', 'identity'],
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      date: '2026-10-13',
      updatedAt: '2026-10-13T10:00:00.000Z',
    },
    {
      _id: 'item-2',
      title: 'Camera',
      description: '',
      type: 'Receipt',
      category: 'Home',
      url: '',
      username: '',
      hasPassword: false,
      tags: ['gear'],
      fileUrl: '',
      fileName: '',
      fileSize: 0,
      date: '2026-10-13',
      updatedAt: '2026-10-13T10:00:00.000Z',
    },
  ],
  searchResults: null,
  reminders: [],
  categories: [],
  loading: false,
  searching: false,
  search: vi.fn(),
  saveItem: vi.fn(),
}));

vi.mock('../stores/WorkspaceStore', () => ({
  useWorkspace: () => workspace,
}));

describe('ItemsPage', () => {
  it('sends comma-separated tags through the main search box', () => {
    render(
      <MemoryRouter>
        <PreferencesProvider>
          <ItemsPage />
        </PreferencesProvider>
      </MemoryRouter>,
    );

    const searchBox = screen.getByRole('textbox', { name: 'All saved' });
    expect(searchBox).toHaveAttribute('placeholder', expect.stringContaining('comma-separate tags'));

    fireEvent.change(searchBox, { target: { value: 'travel, identity' } });

    expect(workspace.search).toHaveBeenCalledWith('travel, identity');
  });
});
