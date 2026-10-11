import { useEffect, useState, type FormEvent } from 'react';
import { Archive, CalendarDays, Check, ChevronRight, Copy, Download, Eye, EyeOff, FileText, Image, KeyRound, Link as LinkIcon, Pencil, ReceiptText, Tag, Trash2, X } from 'lucide-react';
import { downloadItemFile, getRelatedItems, revealItemPassword } from '../../api/items';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePreferences } from '../../stores/PreferencesStore';
import { useWorkspace } from '../../stores/WorkspaceStore';
import type { ItemType, MemoryItem } from '../../types';
import { categoryLabel } from '../../utils/categories';
import { getReminderItemId } from '../../utils/reminders';

const typeIcons = {
  Document: FileText,
  Receipt: ReceiptText,
  Note: Archive,
  Link: LinkIcon,
  Image,
  Password: KeyRound,
};

const AUTO_HIDE_MS = 30_000;

export function ItemDetails({ item, onClose, onEdit, onOpenRelated }: {
  item: MemoryItem;
  onClose: () => void;
  onEdit: () => void;
  onOpenRelated: (item: MemoryItem) => void;
}) {
  const { reminders, deleteItem, addReminder, toggleReminder, deleteReminder, setError } = useWorkspace();
  const { t, locale } = usePreferences();
  const dateFormat = useDateFormat();
  const [related, setRelated] = useState<MemoryItem[]>([]);
  const [reminderError, setReminderError] = useState('');
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);
  const Icon = typeIcons[item.type as ItemType] || FileText;
  const itemReminders = reminders.filter((reminder) => getReminderItemId(reminder) === item._id);

  useEffect(() => {
    let cancelled = false;
    getRelatedItems(item._id)
      .then((result) => {
        if (!cancelled) setRelated(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : t('loadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [item._id, setError, t]);

  useEffect(() => {
    setSecret(null);
    setCopied(null);
  }, [item._id]);

  useEffect(() => {
    if (secret === null) return undefined;
    const timer = window.setTimeout(() => setSecret(null), AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [secret]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function toggleSecret() {
    if (secret !== null) return setSecret(null);
    try {
      setSecret(await revealItemPassword(item._id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('passwordError'));
    }
  }

  async function copy(kind: 'username' | 'password') {
    try {
      const value = kind === 'username' ? item.username : await revealItemPassword(item._id);
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('passwordError'));
    }
  }

  async function submitReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') || '').trim();
    const date = String(form.get('date') || '');
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await addReminder(item, title, date, timezone);
      formElement.reset();
      setReminderError('');
    } catch (reason) {
      setReminderError(reason instanceof Error ? reason.message : t('reminderError'));
    }
  }

  async function remove() {
    if (!window.confirm(t('confirmation'))) return;
    try {
      await deleteItem(item);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('loadError'));
    }
  }

  return <div className="detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="detail-panel" role="dialog" aria-modal="true" aria-label={item.title}>
      <header className="detail-header">
        <span className={`item-type-icon type-${item.type.toLowerCase()}`}><Icon size={19} /></span>
        <div className="detail-actions">
          <button className="icon-button" type="button" title={t('edit')} aria-label={t('edit')} onClick={onEdit}><Pencil size={17} /></button>
          <button className="icon-button danger-action" type="button" title={t('delete')} aria-label={t('delete')} onClick={() => void remove()}><Trash2 size={17} /></button>
          <button className="icon-button" type="button" title={t('close')} aria-label={t('close')} onClick={onClose}><X size={18} /></button>
        </div>
      </header>
      <div className="detail-content">
        <p className="eyebrow">{item.category ? categoryLabel(item.category, locale) : t('noCategory')} <span>·</span> {t(item.type)} · {dateFormat.format(new Date(item.date || item.updatedAt))}</p>
        <h2>{item.title}</h2>
        {item.description && <p className="detail-description">{item.description}</p>}
        {item.type === 'Password' && <section className="secret-card" aria-label={t('Password')}>
          {item.username && <div className="secret-row">
            <span className="secret-label">{t('username')}</span>
            <strong className="secret-value" dir="ltr">{item.username}</strong>
            <button className="icon-button icon-button-small" type="button" title={t('copy')} aria-label={t('copy')} onClick={() => void copy('username')}>{copied === 'username' ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>}
          <div className="secret-row">
            <span className="secret-label">{t('passwordField')}</span>
            <strong className="secret-value" dir="ltr">{secret !== null ? secret : '••••••••••'}</strong>
            <button className="icon-button icon-button-small" type="button" title={secret !== null ? t('hidePassword') : t('showPassword')} aria-label={secret !== null ? t('hidePassword') : t('showPassword')} onClick={() => void toggleSecret()}>{secret !== null ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            <button className="icon-button icon-button-small" type="button" title={t('copy')} aria-label={t('copy')} onClick={() => void copy('password')}>{copied === 'password' ? <Check size={15} /> : <Copy size={15} />}</button>
          </div>
        </section>}
        {(item.type === 'Link' || item.type === 'Password') && item.url && <a className="attachment-card" href={item.url} target="_blank" rel="noopener noreferrer">
          <span className="attachment-icon"><LinkIcon size={18} /></span><span className="attachment-name"><strong dir="ltr">{item.url}</strong><small>{t('openLink')}</small></span><ChevronRight size={17} />
        </a>}
        {item.fileName && <button className="attachment-card" type="button" onClick={() => void downloadItemFile(item).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t('fileError')))}>
          <span className="attachment-icon"><Download size={18} /></span><span className="attachment-name"><strong>{item.fileName}</strong><small>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</small></span><ChevronRight size={17} />
        </button>}
        {item.tags.length > 0 && <div className="tag-list"><Tag size={15} />{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <section className="detail-section">
          <div className="detail-section-title"><h3>{t('related')}</h3><span>{related.length}</span></div>
          {related.length ? related.map((entry) => {
            const RelatedIcon = typeIcons[entry.type] || Archive;
            return <button className="related-item" key={entry._id} type="button" onClick={() => onOpenRelated(entry)}>
              <span className={`item-type-icon small type-${entry.type.toLowerCase()}`}><RelatedIcon size={15} /></span><span className="related-copy"><strong>{entry.title}</strong><small>{entry.category ? categoryLabel(entry.category, locale) : t(entry.type)}</small></span><ChevronRight size={16} />
            </button>;
          }) : <p className="empty-copy">{t('noRelated')}</p>}
        </section>
        <section className="detail-section">
          <div className="detail-section-title"><CalendarDays size={17} /><h3>{t('reminderForItem')}</h3></div>
          {itemReminders.map((reminder) => <div className={`detail-reminder ${reminder.completed ? 'is-complete' : ''}`} key={reminder._id}>
            <button className="check-button" type="button" aria-label={reminder.completed ? t('reopenReminder') : t('completeReminder')} onClick={() => void toggleReminder(reminder)}>{reminder.completed ? '✓' : ''}</button>
            <span>{reminder.title}</span><time>{dateFormat.format(new Date(reminder.reminderDate))}</time>
            <button className="icon-button icon-button-small danger-action" type="button" title={t('deleteReminder')} aria-label={t('deleteReminder')} onClick={() => { if (window.confirm(t('reminderConfirmation'))) void deleteReminder(reminder); }}><Trash2 size={14} /></button>
          </div>)}
          <form className="reminder-form" onSubmit={submitReminder}>
            <input name="title" required maxLength={160} aria-label={t('reminderTitle')} placeholder={t('reminderTitle')} />
            <input name="date" type="datetime-local" required aria-label={t('reminderDate')} />
            {reminderError && <p className="form-error" role="alert">{reminderError}</p>}
            <button className="button button-secondary" type="submit"><CalendarDays size={16} />{t('addReminder')}</button>
          </form>
        </section>
      </div>
    </aside>
  </div>;
}