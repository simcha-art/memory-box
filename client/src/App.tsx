import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Archive, ArrowDownUp, Bell, Check, ChevronDown, CircleHelp, FileText, Image, Link as LinkIcon, LogOut, Plus, ReceiptText, Search, Tag, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { downloadFile, jsonBody, request, type ItemType, type MemoryItem, type Reminder } from './api';

const types: ItemType[] = ['Document', 'Receipt', 'Note', 'Link', 'Image'];
type View = 'items' | 'reminders';
type ItemInput = Pick<MemoryItem, 'title' | 'description' | 'type' | 'category' | 'tags' | 'date'>;

const typeIcons = {
  Document: FileText,
  Receipt: ReceiptText,
  Note: Archive,
  Link: LinkIcon,
  Image,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function itemId(reminder: Reminder) {
  return typeof reminder.itemId === 'string' ? reminder.itemId : reminder.itemId?._id;
}

export function App() {
  const { user, loading, authenticate, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const view: View = location.pathname === '/reminders' ? 'reminders' : 'items';
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [related, setRelated] = useState<MemoryItem[]>([]);
  const [editing, setEditing] = useState<MemoryItem | null | false>(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadWorkspace() {
    setLoadingData(true);
    setError('');
    try {
      const [itemResult, reminderResult, categoryResult] = await Promise.all([
        request<{ items: MemoryItem[] }>('/items'),
        request<{ reminders: Reminder[] }>('/reminders'),
        request<{ categories: { _id: string; name: string }[] }>('/categories'),
      ]);
      setItems(itemResult.items);
      setReminders(reminderResult.reminders);
      setCategories(categoryResult.categories);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your box');
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (user) void loadWorkspace();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) return () => { cancelled = true; };
    if (!deferredQuery) {
      request<{ items: MemoryItem[] }>('/items')
        .then((result) => { if (!cancelled) setItems(result.items); })
        .catch(() => undefined);
      return () => { cancelled = true; };
    }
    request<{ items: MemoryItem[] }>(`/items/search?q=${encodeURIComponent(deferredQuery)}`)
      .then((result) => { if (!cancelled) setItems(result.items); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Search failed'); });
    return () => { cancelled = true; };
  }, [deferredQuery]);

  useEffect(() => {
    if (!selected) {
      setRelated([]);
      return;
    }
    request<{ items: MemoryItem[] }>(`/items/${selected._id}/related`)
      .then((result) => setRelated(result.items))
      .catch(() => setRelated([]));
  }, [selected?._id]);

  const visibleItems = useMemo(() => items.filter((item) =>
    (!categoryFilter || item.category === categoryFilter)
    && (!typeFilter || item.type === typeFilter)), [items, categoryFilter, typeFilter]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    setAuthError('');
    try {
      await authenticate(authMode, values);
    } catch (reason) {
      setAuthError(reason instanceof Error ? reason.message : 'Could not sign in');
    }
  }

  async function saveItem(input: ItemInput, file?: File) {
    const form = new FormData();
    Object.entries({ ...input, tags: input.tags.join(',') }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, String(value));
    });
    if (file) form.append('file', file);
    const path = editing && typeof editing !== 'boolean' ? `/items/${editing._id}` : '/items';
    const result = await request<{ item: MemoryItem }>(path, {
      method: editing && typeof editing !== 'boolean' ? 'PUT' : 'POST',
      body: form,
    });
    if (input.category && !categories.some((category) => category.name.toLowerCase() === input.category.toLowerCase())) {
      try {
        const categoryResult = await request<{ category: { _id: string; name: string } }>('/categories', {
          method: 'POST', body: jsonBody({ name: input.category }),
        });
        setCategories((current) => [...current, categoryResult.category].sort((left, right) => left.name.localeCompare(right.name)));
      } catch {
        // A concurrent save may already have created the category.
      }
    }
    setSuccess(editing && typeof editing !== 'boolean' ? 'Changes saved' : 'Saved to your box');
    setEditing(false);
    setSelected(result.item);
    await loadWorkspace();
  }

  async function deleteSelected() {
    if (!selected || !window.confirm(`Delete “${selected.title}”?`)) return;
    await request(`/items/${selected._id}`, { method: 'DELETE' });
    setSelected(null);
    setSuccess('Item deleted');
    await loadWorkspace();
  }

  async function createCategory() {
    const name = window.prompt('Category name');
    if (!name?.trim()) return;
    try {
      const result = await request<{ category: { _id: string; name: string } }>('/categories', {
        method: 'POST', body: jsonBody({ name: name.trim() }),
      });
      setCategories((current) => [...current, result.category].sort((left, right) => left.name.localeCompare(right.name)));
      setCategoryFilter(result.category.name);
      navigate('/items');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create category');
    }
  }

  async function toggleReminder(reminder: Reminder) {
    await request(`/reminders/${reminder._id}`, {
      method: 'PATCH', body: jsonBody({ completed: !reminder.completed }),
    });
    await loadWorkspace();
  }

  async function addReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    await request('/reminders', {
      method: 'POST',
      body: jsonBody({ itemId: selected._id, title: values.title, reminderDate: new Date(String(values.reminderDate)).toISOString() }),
    });
    setSuccess('Reminder added');
    await loadWorkspace();
  }

  if (loading) return <main className="boot-screen"><span className="brand-mark">M</span><p>Opening your box…</p></main>;

  if (!user) {
    return <main className="auth-screen">
      <section className="auth-aside">
        <span className="brand-mark">M</span>
        <div><p className="eyebrow">YOUR PERSONAL ARCHIVE</p><h1>Keep the details<br />that keep life moving.</h1></div>
        <span className="auth-stamp"><Archive size={16} /> PRIVATE BY DESIGN</span>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">MEMORYBOX / {authMode.toUpperCase()}</p>
          <h2>{authMode === 'login' ? 'Welcome back.' : 'Make room for less forgetting.'}</h2>
          <p className="muted">Your receipts, records, and little things worth keeping.</p>
          <form className="form-stack" onSubmit={submitAuth}>
            {authMode === 'register' && <label>Your name<input name="name" required maxLength={80} autoComplete="name" /></label>}
            <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
            <label>Password<input name="password" type="password" required minLength={authMode === 'register' ? 8 : 1} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>
            {authError && <p className="form-error" role="alert">{authError}</p>}
            <button className="button button-primary button-wide" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <p className="auth-switch">{authMode === 'login' ? 'New to MemoryBox?' : 'Already have an account?'} <button className="text-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
        </div>
      </section>
    </main>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="wordmark" href="#top"><span className="brand-mark">M</span><span>memory<span className="wordmark-light">box</span></span></a>
      <div className="side-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={view === 'items' ? 'nav-link active' : 'nav-link'} onClick={() => { navigate('/items'); setCategoryFilter(''); }}><Archive size={17} /> All saved <span className="nav-count">{items.length}</span></button>
        <button className={view === 'reminders' ? 'nav-link active' : 'nav-link'} onClick={() => navigate('/reminders')}><Bell size={17} /> Reminders <span className="nav-count">{reminders.filter((reminder) => !reminder.completed).length}</span></button>
      </nav>
      <div className="side-section-head"><span className="side-label">CATEGORIES</span><button className="icon-button small" title="Add category" aria-label="Add category" onClick={() => void createCategory()}><Plus size={15} /></button></div>
      <nav className="category-nav" aria-label="Categories">
        {categories.map((category) => <button key={category._id} className={categoryFilter === category.name ? 'category-link active' : 'category-link'} onClick={() => { navigate('/items'); setCategoryFilter(categoryFilter === category.name ? '' : category.name); }}><span className="category-dot" />{category.name}</button>)}
        {!categories.length && <span className="empty-side">Your categories appear here</span>}
      </nav>
      <div className="sidebar-bottom"><CircleHelp size={16} /><span>Everything, in its place.</span></div>
    </aside>

    <main className="main-area" id="top">
      <header className="topbar">
        <div className="crumb"><span>YOUR BOX</span><span className="crumb-slash">/</span><strong>{view === 'items' ? categoryFilter || 'All saved' : 'Reminders'}</strong></div>
        <div className="top-actions"><span className="user-name">{user.name}</span><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={17} /></button></div>
      </header>
      <section className="content-area">
        <div className="page-heading">
          <div><p className="eyebrow">A LITTLE LESS TO REMEMBER</p><h1>{view === 'items' ? 'Your saved things' : 'Things to come back to'}</h1><p className="muted">{view === 'items' ? 'The useful details, all in one place.' : 'A gentle nudge when it matters.'}</p></div>
          {view === 'items' && <button className="button button-primary" onClick={() => setEditing(null)}><Plus size={17} /> Add to box</button>}
        </div>

        {error && <div className="notice error-notice" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={16} /></button></div>}
        {success && <div className="notice success-notice" role="status">{success}<button aria-label="Dismiss message" onClick={() => setSuccess('')}><X size={16} /></button></div>}

        {view === 'items' ? <>
          <div className="toolbar">
            <label className="search-box"><Search size={18} /><input aria-label="Search saved things" placeholder="Search titles, tags, notes…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <label className="select-wrap"><Tag size={15} /><select aria-label="Filter by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All types</option>{types.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown size={14} /></label>
            <button className="icon-button sort-button" title="Sorted by recently updated" aria-label="Sorted by recently updated"><ArrowDownUp size={17} /></button>
          </div>
          <div className="results-line"><span>{visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}</span><span>{query ? `MATCHING “${query}”` : 'RECENTLY UPDATED'}</span></div>
          <div className="workspace-grid">
            <div className="item-list" aria-busy={loadingData}>
              {loadingData && !items.length ? <div className="empty-state">Loading your saved things…</div> : visibleItems.length ? visibleItems.map((item) => <ItemRow key={item._id} item={item} onClick={() => setSelected(item)} />) : <div className="empty-state"><span className="empty-icon"><Archive size={20} /></span><h3>{query ? 'Nothing found yet' : 'Your box is ready'}</h3><p>{query ? 'Try another title, tag, or phrase.' : 'Save a receipt, a link, or a note to get started.'}</p>{!query && <button className="button button-outline" onClick={() => setEditing(null)}><Plus size={16} /> Add your first item</button>}</div>}
            </div>
            <aside className="right-rail">
              <div className="rail-heading"><span className="rail-icon"><Bell size={15} /></span><h2>Coming up</h2><button className="text-button tiny" onClick={() => navigate('/reminders')}>See all</button></div>
              {reminders.filter((reminder) => !reminder.completed).slice(0, 3).map((reminder) => <div className="upcoming-row" key={reminder._id}><span className="reminder-date">{new Date(reminder.reminderDate).getDate()}</span><div><strong>{reminder.title}</strong><small>{formatDate(reminder.reminderDate)}</small></div></div>)}
              {!reminders.some((reminder) => !reminder.completed) && <p className="rail-empty">Nothing due soon. A rare quiet moment.</p>}
              <div className="rail-rule" />
              <div className="rail-heading"><span className="rail-icon green"><Archive size={15} /></span><h2>At a glance</h2></div>
              <div className="stat-row"><span>Saved items</span><strong>{items.length}</strong></div>
              <div className="stat-row"><span>Categories</span><strong>{categories.length}</strong></div>
              <div className="stat-row"><span>Open reminders</span><strong>{reminders.filter((reminder) => !reminder.completed).length}</strong></div>
            </aside>
          </div>
        </> : <section className="reminder-view">
          <div className="reminder-list">
            {reminders.length ? reminders.map((reminder) => <ReminderRow key={reminder._id} reminder={reminder} onToggle={() => void toggleReminder(reminder)} onOpen={() => {
              const id = itemId(reminder);
              const match = items.find((item) => item._id === id);
              if (match) setSelected(match);
            }} />) : <div className="empty-state"><span className="empty-icon"><Bell size={20} /></span><h3>No reminders yet</h3><p>Open a saved item to set a date to revisit it.</p></div>}
          </div>
        </section>}
      </section>
    </main>

    {selected && <ItemDetail item={selected} related={related} reminders={reminders.filter((reminder) => itemId(reminder) === selected._id)} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onDelete={() => void deleteSelected()} onToggleReminder={(reminder) => void toggleReminder(reminder)} onAddReminder={addReminder} onOpenRelated={setSelected} onDownload={() => void downloadFile(selected.fileUrl, selected.fileName).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Download failed'))} />}
    {editing !== false && <ItemEditor item={editing || undefined} categories={categories.map((category) => category.name)} onClose={() => setEditing(false)} onSave={saveItem} />}
  </div>;
}

function ItemRow({ item, onClick }: { item: MemoryItem; onClick: () => void }) {
  const Icon = typeIcons[item.type] || FileText;
  return <button className="item-row" onClick={onClick}>
    <span className={`item-icon icon-${item.type.toLowerCase()}`}><Icon size={18} /></span>
    <span className="item-copy"><strong>{item.title}</strong><span>{item.description || item.fileName || item.tags.slice(0, 3).join(' · ') || 'No extra details'}</span></span>
    <span className="item-category">{item.category || item.type}</span>
    <span className="item-date">{formatDate(item.date || item.updatedAt)}</span>
    <ChevronDown className="row-chevron" size={16} />
  </button>;
}

function ReminderRow({ reminder, onToggle, onOpen }: { reminder: Reminder; onToggle: () => void; onOpen: () => void }) {
  return <article className={reminder.completed ? 'reminder-card completed' : 'reminder-card'}>
    <button className="check-button" aria-label={reminder.completed ? 'Mark reminder incomplete' : 'Complete reminder'} onClick={onToggle}>{reminder.completed && <Check size={14} />}</button>
    <button className="reminder-copy" onClick={onOpen}><strong>{reminder.title}</strong><span>{typeof reminder.itemId === 'string' ? 'Saved item' : reminder.itemId?.title || 'Saved item'}</span></button>
    <time>{formatDate(reminder.reminderDate)}</time>
  </article>;
}

function ItemEditor({ item, categories, onClose, onSave }: { item?: MemoryItem; categories: string[]; onClose: () => void; onSave: (input: ItemInput, file?: File) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: ItemInput = {
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      type: String(form.get('type') || 'Document') as ItemType,
      category: String(form.get('category') || '').trim(),
      tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      date: String(form.get('date') || new Date().toISOString().slice(0, 10)),
    };
    const file = (form.get('file') as File).size ? form.get('file') as File : undefined;
    setSaving(true);
    setFormError('');
    try {
      await onSave(input, file);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Could not save item');
      setSaving(false);
    }
  }

  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header className="modal-header"><div><p className="eyebrow">{item ? 'UPDATE YOUR ARCHIVE' : 'ADD TO YOUR ARCHIVE'}</p><h2 id="editor-title">{item ? 'Edit saved item' : 'Save something useful'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
      <form className="editor-form" onSubmit={submit}>
        <label>Title<input name="title" required maxLength={160} defaultValue={item?.title} autoFocus placeholder="e.g. Bike shop receipt" /></label>
        <div className="form-columns"><label>Type<select name="type" defaultValue={item?.type || 'Document'}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label>Date<input name="date" type="date" defaultValue={item?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)} /></label></div>
        <label>Category<input name="category" list="category-options" defaultValue={item?.category} placeholder="e.g. Home, Travel" /><datalist id="category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
        <label>Tags<input name="tags" defaultValue={item?.tags.join(', ')} placeholder="warranty, kitchen, 2026" /><span className="field-hint">Separate tags with commas</span></label>
        <label>Details<textarea name="description" rows={4} maxLength={10000} defaultValue={item?.description} placeholder="What should future-you know?" /></label>
        <label className="file-drop"><span className="file-symbol"><Plus size={16} /></span><span><strong>{item?.fileName || 'Attach a file'}</strong><small>PDF, JPG, PNG, or WEBP · up to 10 MB</small></span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" /></label>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <footer className="modal-footer"><button className="button button-quiet" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : item ? 'Save changes' : 'Save item'}</button></footer>
      </form>
    </section>
  </div>;
}

function ItemDetail({ item, related, reminders, onClose, onEdit, onDelete, onToggleReminder, onAddReminder, onOpenRelated, onDownload }: {
  item: MemoryItem;
  related: MemoryItem[];
  reminders: Reminder[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleReminder: (reminder: Reminder) => void;
  onAddReminder: (event: FormEvent<HTMLFormElement>) => void;
  onOpenRelated: (item: MemoryItem) => void;
  onDownload: () => void;
}) {
  const Icon = typeIcons[item.type] || FileText;
  return <div className="detail-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <header className="detail-top"><span className={`item-icon icon-${item.type.toLowerCase()}`}><Icon size={18} /></span><div className="detail-actions"><button className="icon-button" title="Edit item" aria-label="Edit item" onClick={onEdit}><FileText size={17} /></button><button className="icon-button danger-icon" title="Delete item" aria-label="Delete item" onClick={onDelete}><Trash2 size={17} /></button><button className="icon-button" title="Close details" aria-label="Close details" onClick={onClose}><X size={18} /></button></div></header>
      <div className="detail-body"><p className="eyebrow">{item.category || item.type} · SAVED {formatDate(item.date || item.updatedAt).toUpperCase()}</p><h2 id="detail-title">{item.title}</h2>
        {item.description && <p className="detail-description">{item.description}</p>}
        {item.fileName && <button className="attachment-link" type="button" onClick={onDownload}><FileText size={17} /><span><strong>{item.fileName}</strong><small>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</small></span><ChevronDown size={15} /></button>}
        {item.tags.length > 0 && <div className="detail-tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
        <section className="detail-section"><div className="detail-section-heading"><h3>Related items</h3><span>{related.length}</span></div>{related.length ? related.map((entry) => <button className="related-row" key={entry._id} onClick={() => onOpenRelated(entry)}><span className={`item-icon icon-${entry.type.toLowerCase()}`}><Archive size={15} /></span><span><strong>{entry.title}</strong><small>{entry.category || entry.type}</small></span><ChevronDown size={15} /></button>) : <p className="subtle-copy">No related items yet. Matching tags and categories appear here.</p>}</section>
        <section className="detail-section"><div className="detail-section-heading"><h3>Reminders</h3></div>{reminders.map((reminder) => <div className="detail-reminder" key={reminder._id}><button className="check-button" aria-label={reminder.completed ? 'Mark reminder incomplete' : 'Complete reminder'} onClick={() => onToggleReminder(reminder)}>{reminder.completed && <Check size={14} />}</button><span>{reminder.title}</span><time>{formatDate(reminder.reminderDate)}</time></div>)}
          <form className="reminder-form" onSubmit={onAddReminder}><input name="title" required maxLength={160} placeholder="Reminder title" aria-label="Reminder title" /><input name="reminderDate" type="date" required min={new Date().toISOString().slice(0, 10)} aria-label="Reminder date" /><button className="button button-outline" type="submit"><Bell size={15} /> Add reminder</button></form>
        </section>
      </div>
    </aside>
  </div>;
}
