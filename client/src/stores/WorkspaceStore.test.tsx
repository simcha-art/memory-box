import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from './PreferencesStore';
import { useWorkspace, WorkspaceProvider } from './WorkspaceStore';
import type { Category, ItemInput, MemoryItem, Reminder } from '../types';

const api = vi.hoisted(() => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  listCategories: vi.fn(),
  listItems: vi.fn(),
  removeItem: vi.fn(),
  saveItem: vi.fn(),
  searchItems: vi.fn(),
  createReminder: vi.fn(),
  deleteReminder: vi.fn(),
  listReminders: vi.fn(),
  setReminderCompleted: vi.fn(),
  user: { id: 'user-1', name: 'Ada', email: 'ada@example.com', role: 'user' as const },
}));

vi.mock('../api/categories', () => ({
  createCategory: api.createCategory,
  deleteCategory: api.deleteCategory,
  listCategories: api.listCategories,
}));
vi.mock('../api/items', () => ({
  listItems: api.listItems,
  removeItem: api.removeItem,
  saveItem: api.saveItem,
  searchItems: api.searchItems,
}));
vi.mock('../api/reminders', () => ({
  createReminder: api.createReminder,
  deleteReminder: api.deleteReminder,
  listReminders: api.listReminders,
  setReminderCompleted: api.setReminderCompleted,
}));
vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: api.user }),
}));

const item: MemoryItem = {
  _id: 'item-1',
  title: 'Warranty',
  description: '',
  type: 'Note',
  category: 'Home',
  url: '',
  username: '',
  hasPassword: false,
  tags: [],
  fileUrl: '',
  fileName: '',
  fileSize: 0,
  date: '2026-10-13',
  updatedAt: '2026-10-13T10:00:00.000Z',
};
const category: Category = { _id: 'category-1', name: 'Home' };
const reminder: Reminder = {
  _id: 'reminder-1',
  itemId: item._id,
  title: 'Review warranty',
  reminderDate: '2026-10-13T10:00:00.000Z',
  completed: false,
};
const input: ItemInput = {
  title: item.title,
  description: '',
  type: 'Note',
  category: 'Home',
  url: '',
  tags: [],
  date: '2026-10-13',
};

function WorkspaceProbe() {
  const workspace = useWorkspace();
  return (
    <div>
      <output data-testid="workspace">
        {JSON.stringify({
          items: workspace.items.length,
          searchResults: workspace.searchResults?.length ?? null,
          reminders: workspace.reminders.length,
          categories: workspace.categories.map((entry) => entry.name),
          loading: workspace.loading,
          searching: workspace.searching,
          error: workspace.error,
          notice: workspace.notice?.message ?? null,
        })}
      </output>
      <button onClick={() => void workspace.refresh()}>Refresh</button>
      <button onClick={() => workspace.search('annual')}>Search</button>
      <button onClick={() => void workspace.saveItem(input)}>Save item</button>
      <button onClick={() => void workspace.saveItem({ ...input, category: 'Travel' })}>Save with new category</button>
      <button onClick={() => void workspace.deleteItem(item)}>Delete item</button>
      <button onClick={() => void workspace.addCategory('Zulu')}>Add category</button>
      <button onClick={() => void workspace.removeCategory(category)}>Remove category</button>
      <button onClick={() => void workspace.addReminder(item, 'Review', '2026-10-13', 'UTC', 'yearly')}>Add reminder</button>
      <button onClick={() => void workspace.toggleReminder(reminder)}>Toggle reminder</button>
      <button onClick={() => void workspace.deleteReminder(reminder)}>Delete reminder</button>
      <button onClick={() => workspace.setError('manual error')}>Set error</button>
      <button onClick={workspace.dismissNotice}>Dismiss notice</button>
    </div>
  );
}

function renderWorkspace() {
  return render(
    <PreferencesProvider>
      <WorkspaceProvider><WorkspaceProbe /></WorkspaceProvider>
    </PreferencesProvider>,
  );
}

function state() {
  return JSON.parse(screen.getByTestId('workspace').textContent || '{}') as {
    items: number;
    searchResults: number | null;
    reminders: number;
    categories: string[];
    loading: boolean;
    searching: boolean;
    error: string;
    notice: string | null;
  };
}

describe('WorkspaceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listItems.mockResolvedValue([item]);
    api.listReminders.mockResolvedValue([reminder]);
    api.listCategories.mockResolvedValue([category]);
    api.searchItems.mockResolvedValue([item]);
    api.saveItem.mockResolvedValue(item);
    api.removeItem.mockResolvedValue(undefined);
    api.createCategory.mockResolvedValue({ _id: 'category-2', name: 'Zulu' });
    api.deleteCategory.mockResolvedValue(undefined);
    api.createReminder.mockResolvedValue(undefined);
    api.setReminderCompleted.mockResolvedValue(undefined);
    api.deleteReminder.mockResolvedValue(undefined);
  });

  it('loads workspace data, runs searches, and clears search results', async () => {
    renderWorkspace();
    await waitFor(() => expect(state()).toMatchObject({ items: 1, reminders: 1, categories: ['Home'], loading: false }));

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(api.searchItems).toHaveBeenCalledWith('annual'));
    await waitFor(() => expect(state().searchResults).toBe(1));

    api.listItems.mockRejectedValueOnce(new Error('Workspace unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(state().error).toBe('Workspace unavailable'));
    expect(state().searchResults).toBe(1);
  });

  it('saves and deletes items, keeping categories synchronized and reporting outcomes', async () => {
    renderWorkspace();
    await waitFor(() => expect(state().items).toBe(1));

    fireEvent.click(screen.getByRole('button', { name: 'Save item' }));
    await waitFor(() => expect(state().notice).toBe('Saved to your box'));
    expect(api.createCategory).not.toHaveBeenCalled();
    expect(api.saveItem).toHaveBeenCalledWith(input, undefined, undefined);

    api.createCategory.mockRejectedValueOnce(new Error('Category conflict'));
    fireEvent.click(screen.getByRole('button', { name: 'Save with new category' }));
    await waitFor(() => expect(state().notice).toBe('Your item was saved, but its category could not be created. Category conflict'));

    fireEvent.click(screen.getByRole('button', { name: 'Delete item' }));
    await waitFor(() => expect(state().notice).toBe('Item deleted'));
    expect(api.removeItem).toHaveBeenCalledWith(item._id);
  });

  it('creates and removes categories and reminders and handles reminder errors', async () => {
    renderWorkspace();
    await waitFor(() => expect(state().categories).toEqual(['Home']));

    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    await waitFor(() => expect(state().categories).toEqual(['Home', 'Zulu']));
    expect(api.createCategory).toHaveBeenCalledWith('Zulu');

    fireEvent.click(screen.getByRole('button', { name: 'Remove category' }));
    await waitFor(() => expect(state().notice).toBe('Category deleted'));
    expect(api.deleteCategory).toHaveBeenCalledWith(category._id);

    fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }));
    await waitFor(() => expect(state().notice).toBe('Reminder added'));
    expect(api.createReminder).toHaveBeenCalledWith(item._id, 'Review', '2026-10-13', 'UTC', 'yearly');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle reminder' }));
    await waitFor(() => expect(api.setReminderCompleted).toHaveBeenCalledWith(reminder));

    api.deleteReminder.mockRejectedValueOnce(new Error('Could not delete reminder'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete reminder' }));
    await waitFor(() => expect(state().error).toBe('Could not delete reminder'));
  });
});
