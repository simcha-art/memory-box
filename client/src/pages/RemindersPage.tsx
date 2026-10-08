import { useState } from 'react';
import { Bell, CalendarDays } from 'lucide-react';
import { ReminderRow } from '../features/reminders/ReminderRow';
import { ItemDetails } from '../features/items/ItemDetails';
import { ItemEditor } from '../features/items/ItemEditor';
import { usePreferences } from '../stores/PreferencesStore';
import { useWorkspace } from '../stores/WorkspaceStore';
import type { MemoryItem, Reminder } from '../types';
import { getReminderItemId } from '../utils/reminders';

export function RemindersPage() {
  const { reminders, items, categories, toggleReminder, saveItem } = useWorkspace();
  const { t } = usePreferences();
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [editing, setEditing] = useState<MemoryItem | null>(null);

  function openItem(reminder: Reminder) {
    const relatedItem = items.find((item) => item._id === getReminderItemId(reminder));
    if (relatedItem) setSelected(relatedItem);
  }

  return <>
    <section className="page-heading">
      <div><p className="eyebrow">{t('tagline')}</p><h1>{t('comingBack')}</h1><p className="page-subtitle">{t('remindersSubtitle')}</p></div>
      <span className="page-icon"><CalendarDays size={20} /></span>
    </section>
    <section className="reminders-list" aria-label={t('reminders')}>
      {reminders.length ? reminders.map((reminder) => <ReminderRow key={reminder._id} reminder={reminder} onToggle={() => void toggleReminder(reminder)} onOpen={() => openItem(reminder)} />)
        : <div className="empty-state"><span className="empty-state-icon"><Bell size={21} /></span><h2>{t('noReminders')}</h2><p>{t('reminderHint')}</p></div>}
    </section>
    {selected && <ItemDetails item={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onOpenRelated={setSelected} />}
    {editing && <ItemEditor item={editing} categories={categories} onClose={() => setEditing(null)} onSave={(input, file) => saveItem(input, file, editing)} />}
  </>;
}
