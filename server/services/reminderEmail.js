import cron from "node-cron";
import nodemailer from "nodemailer";
import { getRemindersBeforeNow } from "./reminderService.js";

function hasEmailConfig(env) {
    return Boolean(env.EMAIL_USER?.trim() && env.EMAIL_PASS?.trim());
}

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[character],
    );
}

function getTimeZone(value) {
    try {
        new Intl.DateTimeFormat("he-IL", { timeZone: value }).format();
        return value;
    } catch {
        return "UTC";
    }
}

export function formatReminderEmail(reminder) {
    const date = new Date(reminder.reminderDate);
    const formattedDate = date.toLocaleString("he-IL", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: getTimeZone(reminder.timezone || "UTC"),
    });
    const title = escapeHtml(reminder.title);

    return {
        subject: `Reminder: ${reminder.title}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="
  margin: 0;
  padding: 0;
  background-color: #f3f4f6;
  font-family: Arial, Helvetica, sans-serif;
">

  <div style="
    max-width: 520px;
    margin: 40px auto;
    padding: 0 16px;
  ">

    <div style="
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    ">

      <!-- Header -->
      <div style="
        background-color: #4f46e5;
        padding: 28px 24px;
        text-align: center;
      ">
        <div style="font-size: 32px; margin-bottom: 8px;">
          🔔
        </div>

        <h1 style="
          margin: 0;
          color: #ffffff;
          font-size: 24px;
          font-weight: 700;
        ">
          Reminder
        </h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px 28px; text-align: center;">

        <p style="
          margin: 0 0 12px;
          color: #6b7280;
          font-size: 14px;
        ">
          Don't forget!
        </p>

        <h2 style="
          margin: 0 0 20px;
          color: #111827;
          font-size: 22px;
          line-height: 1.4;
        ">
          ${escapeHtml(title)}
        </h2>

        <div style="
          display: inline-block;
          background-color: #eef2ff;
          color: #4338ca;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 28px;
        ">
          📅 ${escapeHtml(formattedDate)}
        </div>

        <!-- Action button -->
        <div style="margin-bottom: 12px;">
          <a href="${escapeHtml("http://localhost:5173/reminders")}"
             target="_blank"
             style="
               display: inline-block;
               background-color: #4f46e5;
               color: #ffffff;
               text-decoration: none;
               padding: 14px 32px;
               border-radius: 8px;
               font-size: 16px;
               font-weight: 600;
             ">
            Open Reminder →
          </a>
        </div>

        <p style="
          margin: 16px 0 0;
          color: #9ca3af;
          font-size: 12px;
          line-height: 1.6;
        ">
          This is an automated reminder.
        </p>

      </div>
    </div>

  </div>

</body>
</html>
`
    };
}

export async function sendDueReminders({
    findDueReminders = getRemindersBeforeNow,
    sendEmail,
    logger = console,
}) {
    if (typeof sendEmail !== "function")
        throw new TypeError("sendEmail must be a function");

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

export function startReminderScheduler({
    env = process.env,
    logger = console,
    transporter,
} = {}) {
    if (!hasEmailConfig(env)) {
        logger.warn(
            "Reminder emails are disabled. Set EMAIL_USER and EMAIL_PASS to enable Gmail SMTP delivery.",
        );
        return null;
    }

    const mailTransporter =
        transporter ||
        nodemailer.createTransport({
            service: "gmail",
            auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
        });
    let running = false;

    return cron.schedule("* * * * *", async () => {
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
            logger.error("Reminder schedule run failed:", error);
        } finally {
            running = false;
        }
    });
}
