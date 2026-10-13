import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../stores/PreferencesStore';
import { ReminderCalendar } from './ReminderCalendar';

describe('ReminderCalendar', () => {
  it('selects the current date when Today is clicked', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 12));
    const onSelectDate = vi.fn();

    function CalendarHarness() {
      const [selectedDate, setSelectedDate] = useState(new Date(2026, 9, 1));
      return (
        <ReminderCalendar
          reminders={[]}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            onSelectDate(date);
            setSelectedDate(date);
          }}
        />
      );
    }

    render(
      <PreferencesProvider>
        <CalendarHarness />
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(onSelectDate).toHaveBeenCalledOnce();
    expect(onSelectDate.mock.calls[0][0]).toEqual(new Date(2026, 9, 13, 12));
    expect(screen.getByRole('gridcell', { name: /13/ })).toHaveAttribute('aria-selected', 'true');
    vi.useRealTimers();
  });
});
