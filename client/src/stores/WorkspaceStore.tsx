import { createContext, useCallback, useContext, useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createCategory as createCategoryRequest, listCategories } from '../api/categories';
import { listItems, removeItem, saveItem as saveItemRequest, searchItems } from '../api/items';
import { createReminder as createReminderRequest, listReminders, setReminderCompleted } from '../api/reminders';
import type { Category, ItemInput, MemoryItem, Reminder } from '../types';
import { useAuth } from '../features/auth/AuthContext';
import { usePreferences } from './PreferencesStore';

type Notice = { kind: 'success' | 'error'; message: string } | null;
type WorkspaceValue = {
  items: MemoryItem[];
  searchResults: MemoryItem[] | null;
  reminders: Reminder[];
  categories: Category[];
  loading: boolean;
  searching: boolean;
  error: string;
  notice: Notice;
  setError: (message: string) => void;
  dismissNotice: () => void;
  setNotice: (notice: Notice) => void;
  refresh: () => Promise<void>;
  search: (query: string) => void;
  saveItem: (input: ItemInput, file?: File, existingItem?: MemoryItem) => Promise<MemoryItem>;
  deleteItem: (item: MemoryItem) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  addReminder: (item: MemoryItem, title: string, date: string) => Promise<void>;
  toggleReminder: (reminder: Reminder) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = usePreferences();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<MemoryItem[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [query, setQuery] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const deferredQuery = useDeferredValue(query.trim());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextItems, nextReminders, nextCategories] = await Promise.all([
        listItems(),
        listReminders(),
        listCategories(),
      ]);
      setItems(nextItems);
      setReminders(nextReminders);
      setCategories(nextCategories);
      setSearchResults(null);
      setSearchRevision((revision) => revision + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  useEffect(() => {
    if (!deferredQuery) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchItems(deferredQuery)
      .then((result) => {
        if (!cancelled) setSearchResults(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : t('loadError'));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deferredQuery, searchRevision, t]);

  const search = useCallback((value: string) => setQuery(value), []);

  const saveItem = useCallback(async (input: ItemInput, file?: File, existingItem?: MemoryItem) => {
    setError('');
    const savedItem = await saveItemRequest(input, file, existingItem);
    let categoryFailure = '';
    if (input.category && !categories.some((category) => category.name.toLowerCase() === input.category.toLowerCase())) {
      try {
        const category = await createCategoryRequest(input.category);
        setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
      } catch (reason: unknown) {
        categoryFailure = reason instanceof Error ? reason.message : t('categorySaveError');
      }
    }
    await refresh();
    setNotice(categoryFailure
      ? { kind: 'error', message: `${t('categorySaveError')} ${categoryFailure}` }
      : { kind: 'success', message: t(existingItem ? 'updated' : 'saved') });
    return savedItem;
  }, [categories, refresh, t]);

  const deleteItem = useCallback(async (item: MemoryItem) => {
    setError('');
    await removeItem(item._id);
    setNotice({ kind: 'success', message: t('deleted') });
    await refresh();
  }, [refresh, t]);

  const addCategory = useCallback(async (name: string) => {
    setError('');
    const category = await createCategoryRequest(name);
    setCategories((current) => [...current, category].sort((left, right) => left.name.localeCompare(right.name)));
    return category;
  }, []);

  const addReminder = useCallback(async (item: MemoryItem, title: string, date: string) => {
    setError('');
    await createReminderRequest(item._id, title, date);
    setNotice({ kind: 'success', message: t('reminderAdded') });
    await refresh();
  }, [refresh, t]);

  const toggleReminder = useCallback(async (reminder: Reminder) => {
    setError('');
    try {
      await setReminderCompleted(reminder);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('reminderError'));
    }
  }, [refresh, t]);

  const value = useMemo<WorkspaceValue>(() => ({
    items,
    searchResults,
    reminders,
    categories,
    loading,
    searching,
    error,
    notice,
    setError,
    dismissNotice: () => setNotice(null),
    setNotice,
    refresh,
    search,
    saveItem,
    deleteItem,
    addCategory,
    addReminder,
    toggleReminder,
  }), [items, searchResults, reminders, categories, loading, searching, error, notice, refresh, search, saveItem, deleteItem, addCategory, addReminder, toggleReminder]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
