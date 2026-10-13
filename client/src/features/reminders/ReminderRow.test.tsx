import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../stores/PreferencesStore';
import type { Reminder } from '../../types';
import { ReminderRow } from './ReminderRow';

describe('ReminderRow', () => {
  it('opens linked items, toggles completion, and confirms deletion', () => {
    const reminder: Reminder = {
      _id: 'reminder-1',
      itemId: { _id: 'item-1', title: 'Warranty', type: 'Note' },
      title: 'Check warranty',
      reminderDate: '2026-10-13T10:00:00.000Z',
      completed: false,
      repeat: 'yearly',
    };
    const onToggle = vi.fn();
    const onOpen = vi.fn();
    const onDelete = vi.fn();

    render(
      <PreferencesProvider>
        <ReminderRow reminder={reminder} onToggle={onToggle} onOpen={onOpen} onDelete={onDelete} />
      </PreferencesProvider>,
    );

    expect(screen.getByText('Every year')).toBeInTheDocument();
    expect(screen.getByText('Warranty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete reminder' }));
    fireEvent.click(screen.getByRole('button', { name: /check warranty/i }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Delete reminder' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete reminder' });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
