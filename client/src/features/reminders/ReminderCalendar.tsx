import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePreferences } from '../../stores/PreferencesStore';
import type { Reminder } from '../../types';
import { isSameDay } from '../../utils/reminders';

const MAX_VISIBLE = 2;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function ReminderCalendar({ reminders, selectedDate, onSelectDate }: { reminders: Reminder[]; selectedDate: Date; onSelectDate: (date: Date) => void }) {
  const { t, locale, direction } = usePreferences();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const intlLocale = locale === 'he' ? 'he-IL' : 'en';

  const remindersByDay = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    for (const reminder of reminders) {
      const key = dayKey(new Date(reminder.reminderDate));
      map.set(key, [...(map.get(key) ?? []), reminder]);
    }
    return map;
  }, [reminders]);

  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 7 + i)));
  }, [intlLocale]);

  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(month);
  const leadingBlanks = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const todayKey = dayKey(new Date());
  const Prev = direction === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = direction === 'rtl' ? ChevronLeft : ChevronRight;

  function shift(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return <section className="reminder-calendar-card" aria-label={t('calendar')}>
    <header className="calendar-header">
      <h2>{monthLabel}</h2>
      <div className="calendar-controls">
        <button className="icon-button" type="button" aria-label={t('previousMonth')} onClick={() => shift(-1)}><Prev size={17} /></button>
        <button className="language-button" type="button" onClick={() => { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); }}>{t('today')}</button>
        <button className="icon-button" type="button" aria-label={t('nextMonth')} onClick={() => shift(1)}><Next size={17} /></button>
      </div>
    </header>
    <div className="calendar-grid" role="grid">
      {weekdays.map((name) => <div key={name} className="calendar-weekday" role="columnheader">{name}</div>)}
      {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} className="calendar-cell is-blank" />)}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        const key = dayKey(date);
        const dayReminders = remindersByDay.get(key) ?? [];
        const selected = isSameDay(date, selectedDate);
        return <div key={day} role="gridcell" tabIndex={0} aria-selected={selected}
          className={`calendar-cell is-clickable ${key === todayKey ? 'is-today' : ''} ${selected ? 'is-selected' : ''}`}
          onClick={() => onSelectDate(date)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectDate(date); } }}>
          <span className="calendar-day">{day}</span>
          {dayReminders.slice(0, MAX_VISIBLE).map((reminder) =>
            <span key={reminder._id} title={reminder.title} className={`calendar-event ${reminder.completed ? 'completed' : ''}`}>{reminder.title}</span>)}
          {dayReminders.length > MAX_VISIBLE && <span className="calendar-more">+{dayReminders.length - MAX_VISIBLE} {t('moreReminders')}</span>}
        </div>;
      })}
    </div>
  </section>;
}