import { useEffect, useState, type FormEvent } from 'react';
import { Archive, CalendarDays, ChevronRight, Download, FileText, Image, Link as LinkIcon, Pencil, ReceiptText, Tag, Trash2, X } from 'lucide-react';
import { downloadItemFile, getRelatedItems } from '../../api/items';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePreferences } from '../../stores/PreferencesStore';
import { useWorkspace } from '../../stores/WorkspaceStore';
import type { ItemType, MemoryItem } from '../../types';
import { getReminderItemId } from '../../utils/reminders';

const typeIcons = {
  Document: FileText,
  Receipt: ReceiptText,
  Note: Archive,
  Link: LinkIcon,
  Image,
};

export function ItemDetails({ item, onClose, onEdit, onOpenRelated }: {
  item: MemoryItem;
  onClose: () => void;
  onEdit: () => void;
  onOpenRelated: (item: MemoryItem) => void;
}) {
  const { reminders, deleteItem, addReminder, toggleReminder, setError } = useWorkspace();
  const { t } = usePreferences();
  const dateFormat = useDateFormat();
  const [related, setRelated] = useState<MemoryItem[]>([]);
  const [reminderError, setReminderError] = useState('');
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

  async function submitReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') || '').trim();
    const date = String(form.get('date') || '');
    try {
      await addReminder(item, title, date);
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
        <p className="eyebrow">{item.category || t('noCategory')} <span>·</span> {t(item.type)} · {dateFormat.format(new Date(item.date || item.updatedAt))}</p>
        <h2>{item.title}</h2>
        {item.description && <p className="detail-description">{item.description}</p>}
        {item.fileName && <button className="attachment-card" type="button" onClick={() => void downloadItemFile(item).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t('fileError')))}>
          <span className="attachment-icon"><Download size={18} /></span><span className="attachment-name"><strong>{item.fileName}</strong><small>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</small></span><ChevronRight size={17} />
        </button>}
        {item.tags.length > 0 && <div className="tag-list"><Tag size={15} />{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <section className="detail-section">
          <div className="detail-section-title"><h3>{t('related')}</h3><span>{related.length}</span></div>
          {related.length ? related.map((entry) => {
            const RelatedIcon = typeIcons[entry.type] || Archive;
            return <button className="related-item" key={entry._id} type="button" onClick={() => onOpenRelated(entry)}>
              <span className={`item-type-icon small type-${entry.type.toLowerCase()}`}><RelatedIcon size={15} /></span><span className="related-copy"><strong>{entry.title}</strong><small>{entry.category || t(entry.type)}</small></span><ChevronRight size={16} />
            </button>;
          }) : <p className="empty-copy">{t('noRelated')}</p>}
        </section>
        <section className="detail-section">
          <div className="detail-section-title"><CalendarDays size={17} /><h3>{t('reminderForItem')}</h3></div>
          {itemReminders.map((reminder) => <div className={`detail-reminder ${reminder.completed ? 'is-complete' : ''}`} key={reminder._id}>
            <button className="check-button" type="button" aria-label={reminder.completed ? t('reopenReminder') : t('completeReminder')} onClick={() => void toggleReminder(reminder)}>{reminder.completed ? '✓' : ''}</button>
            <span>{reminder.title}</span><time>{dateFormat.format(new Date(reminder.reminderDate))}</time>
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
