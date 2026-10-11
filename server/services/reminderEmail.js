import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { getRemindersBeforeNow } from './reminderService.js';

function hasEmailConfig(env) {
  return Boolean(env.EMAIL_USER?.trim() && env.EMAIL_PASS?.trim());
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function getTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return 'UTC';
  }
}

export function formatReminderEmail(reminder) {
  const date = new Date(reminder.reminderDate);
  const formattedDate = date.toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: getTimeZone(reminder.timezone || 'UTC'),
  });
  const title = escapeHtml(reminder.title);

  return {
    subject: `Reminder: ${reminder.title}`,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.5"><h2>Reminder</h2><p><strong>${title}</strong></p><p>${escapeHtml(formattedDate)}</p></div>`,
  };
}

export async function sendDueReminders({
  findDueReminders = getRemindersBeforeNow,
  sendEmail,
  logger = console,
}) {
  if (typeof sendEmail !== 'function') throw new TypeError('sendEmail must be a function');

  const reminders = await findDueReminders();
  let sent = 0;

  for (const reminder of reminders) {
    try {
      await sendEmail(reminder);
      reminder.isSent = true;
      await reminder.save();
      sent += 1;
    } catch (error) {
      logger.error(`Could not send reminder ${reminder._id}:`, error);
    }
  }

  return { found: reminders.length, sent };
}

export function startReminderScheduler({ env = process.env, logger = console, transporter } = {}) {
  if (!hasEmailConfig(env)) {
    logger.warn('Reminder emails are disabled. Set EMAIL_USER and EMAIL_PASS to enable Gmail SMTP delivery.');
    return null;
  }

  const mailTransporter = transporter || nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
  let running = false;

  return cron.schedule('* * * * *', async () => {
    if (running) return;
    running = true;
    try {
      await sendDueReminders({
        logger,
        sendEmail: async (reminder) => {
          const message = formatReminderEmail(reminder);
          await mailTransporter.sendMail({
            from: env.EMAIL_USER,
            to: reminder.userEmail,
            ...message,
          });
        },
      });
    } catch (error) {
      logger.error('Reminder schedule run failed:', error);
    } finally {
      running = false;
    }
  });
}