import nodemailer from 'nodemailer';

let cachedTransporter = null;
let cachedKey = null;

function hasEmailConfig(env) {
  return Boolean(env.EMAIL_USER?.trim() && env.EMAIL_PASS?.trim());
}

function getTransporter(env) {
  const key = `${env.EMAIL_USER}:${env.EMAIL_PASS}`;
  if (cachedKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
    cachedKey = key;
  }
  return cachedTransporter;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character],
  );
}

export function buildVerificationUrl(token, env = process.env) {
  const base = (env.CLIENT_URL || env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173')
    .trim()
    .replace(/\/+$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export function formatVerificationEmail({ name, url }) {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);

  return {
    subject: 'Verify your email for MemoryBox / אימות כתובת המייל ב-MemoryBox',
    text: [
      `Hi ${name}, welcome to MemoryBox!`,
      'Open this link to verify your email address (valid for 24 hours):',
      url,
      '',
      `היי ${name}, ברוכים הבאים ל-MemoryBox!`,
      'פתחו את הקישור כדי לאמת את כתובת המייל (תקף ל-24 שעות):',
      url,
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 520px; margin: 40px auto; padding: 0 16px;">
    <div style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">

      <div style="background-color: #4f46e5; padding: 28px 24px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">✉️</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">MemoryBox</h1>
      </div>

      <div style="padding: 32px 28px; text-align: center;">
        <h2 style="margin: 0 0 12px; color: #111827; font-size: 20px;">Hi ${safeName}, welcome!</h2>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
          Confirm your email address to activate your account. The link is valid for 24 hours.
        </p>

        <div dir="rtl" style="margin: 0 0 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 12px; color: #111827; font-size: 20px;">היי ${safeName}, ברוכים הבאים!</h2>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            אשרו את כתובת המייל כדי להפעיל את החשבון. הקישור תקף ל-24 שעות.
          </p>
        </div>

        <a href="${safeUrl}"
           target="_blank"
           style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
          Verify email / אימות מייל
        </a>

        <p style="margin: 24px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
          If you didn't create this account, you can ignore this email.<br />
          אם לא יצרתם חשבון, אפשר להתעלם מהמייל הזה.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`,
  };
}

export async function sendVerificationEmail(
  { name, email, token },
  { env = process.env, transporter, logger = console } = {},
) {
  const url = buildVerificationUrl(token, env);

  if (!hasEmailConfig(env)) {
    if (env.NODE_ENV === 'production') {
      logger.warn('Email is not configured (EMAIL_USER / EMAIL_PASS); verification email was not sent.');
    } else {
      logger.warn(`Email is not configured. Verification link for ${email}: ${url}`);
    }
    return;
  }

  await (transporter || getTransporter(env)).sendMail({
    from: env.EMAIL_USER,
    to: email,
    ...formatVerificationEmail({ name, url }),
  });
}