import { Check, Circle } from 'lucide-react';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePreferences } from '../../stores/PreferencesStore';
import type { Reminder } from '../../types';

export function ReminderRow({ reminder, onToggle, onOpen }: { reminder: Reminder; onToggle: () => void; onOpen: () => void }) {
  const { t } = usePreferences();
  const dateFormat = useDateFormat();
  const linkedItem = typeof reminder.itemId === 'string' ? t('savedItems') : reminder.itemId?.title || t('savedItems');
  return <article className={`reminder-row ${reminder.completed ? 'completed' : ''}`}>
    <button className="reminder-toggle" type="button" aria-label={reminder.completed ? t('reopenReminder') : t('completeReminder')} onClick={onToggle}>
      {reminder.completed ? <Check size={14} /> : <Circle size={18} />}
    </button>
    <button className="reminder-copy" type="button" onClick={onOpen}><strong>{reminder.title}</strong><span>{linkedItem}</span></button>
    <time dateTime={reminder.reminderDate}>{dateFormat.format(new Date(reminder.reminderDate))}</time>
  </article>;
}
