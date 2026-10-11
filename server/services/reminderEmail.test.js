import { describe, expect, it, vi } from 'vitest';
import { formatReminderEmail, sendDueReminders, startReminderScheduler } from './reminderEmail.js';

describe('reminder email notifications', () => {
  it('formats the reminder in its saved timezone and escapes its title', () => {
    const message = formatReminderEmail({
      title: '<script>alert(1)</script>',
      reminderDate: '2026-01-01T12:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });

    expect(message.subject).toBe('Reminder: <script>alert(1)</script>');
    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).toContain('Thursday, January 1, 2026 at 4:00 AM');
  });

  it('marks only successfully sent reminders and continues after a failure', async () => {
    const failed = { _id: 'failed', isSent: false, save: vi.fn() };
    const delivered = { _id: 'delivered', isSent: false, save: vi.fn().mockResolvedValue(undefined) };
    const sendEmail = vi.fn()
      .mockRejectedValueOnce(new Error('SMTP unavailable'))
      .mockResolvedValueOnce(undefined);
    const logger = { error: vi.fn() };

    const result = await sendDueReminders({
      findDueReminders: async () => [failed, delivered],
      sendEmail,
      logger,
    });

    expect(result).toEqual({ found: 2, sent: 1 });
    expect(failed.isSent).toBe(false);
    expect(failed.save).not.toHaveBeenCalled();
    expect(delivered.isSent).toBe(true);
    expect(delivered.save).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it('leaves the API scheduler disabled when Gmail credentials are missing', () => {
    const logger = { warn: vi.fn() };

    expect(startReminderScheduler({ env: {}, logger })).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('EMAIL_USER and EMAIL_PASS'));
  });
});