import { useState } from 'react';
import { Bell, CalendarDays } from 'lucide-react';
import { ReminderCalendar } from '../features/reminders/ReminderCalendar';
import { ReminderRow } from '../features/reminders/ReminderRow';
import { ItemDetails } from '../features/items/ItemDetails';
import { ItemEditor } from '../features/items/ItemEditor';
import { usePreferences } from '../stores/PreferencesStore';
import { useWorkspace } from '../stores/WorkspaceStore';
import type { MemoryItem, Reminder } from '../types';
import { getReminderItemId, isSameDay } from '../utils/reminders';
import { useDateFormat } from '../hooks/useDateFormat';

export function RemindersPage() {
  const { reminders, items, categories, toggleReminder, saveItem } = useWorkspace();
  const { t } = usePreferences();
  const dateFormat = useDateFormat();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [editing, setEditing] = useState<MemoryItem | null>(null);

  const dayReminders = reminders.filter((reminder) => isSameDay(new Date(reminder.reminderDate), selectedDate));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingReminders = reminders
    .filter((reminder) => new Date(reminder.reminderDate) >= startOfToday)
    .sort((a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());

  function openItem(reminder: Reminder) {
    const relatedItem = items.find((item) => item._id === getReminderItemId(reminder));
    if (relatedItem) setSelected(relatedItem);
  }

  return <>
    <section className="page-heading">
      <div><p className="eyebrow">{t('tagline')}</p><h1>{t('comingBack')}</h1><p className="page-subtitle">{t('remindersSubtitle')}</p></div>
      <span className="page-icon"><CalendarDays size={20} /></span>
    </section>
    <ReminderCalendar reminders={reminders} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
    <h2 className="selected-day-title">{t('remindersOnDay')} {dateFormat.format(selectedDate)}</h2>
    <section className="reminders-list" aria-label={t('reminders')}>
      {dayReminders.length ? dayReminders.map((reminder) => <ReminderRow key={reminder._id} reminder={reminder} onToggle={() => void toggleReminder(reminder)} onOpen={() => openItem(reminder)} />)
        : <div className="empty-state compact"><span className="empty-state-icon"><Bell size={21} /></span><h2>{reminders.length ? t('noRemindersDay') : t('noReminders')}</h2>{!reminders.length && <p>{t('reminderHint')}</p>}</div>}
    </section>
    <h2 className="selected-day-title">{t('allUpcoming')}</h2>
    <section className="reminders-list" aria-label={t('allUpcoming')}>
      {upcomingReminders.length ? upcomingReminders.map((reminder) => <ReminderRow key={reminder._id} reminder={reminder} onToggle={() => void toggleReminder(reminder)} onOpen={() => openItem(reminder)} />)
        : <div className="empty-state compact"><span className="empty-state-icon"><Bell size={21} /></span><h2>{t('noUpcoming')}</h2></div>}
    </section>
    {selected && <ItemDetails item={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} onOpenRelated={setSelected} />}
    {editing && <ItemEditor item={editing} categories={categories} onClose={() => setEditing(null)} onSave={(input, file) => saveItem(input, file, editing)} />}
  </>;
}