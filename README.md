# MemoryBox

A personal information manager for documents, receipts, notes, links, and reminders.

## Requirements

- Node.js 20 or newer
- MongoDB 7 or newer

## Local setup

1. Install the API dependencies with `cd server && npm install`.
2. Create the server environment file with `cd server && cp .env.example .env`. Set `MONGODB_URI` to your MongoDB connection string and `JWT_SECRET` to a long random value in `server/.env`. Also set `ENCRYPTION_KEY` (another long random value) — it encrypts saved passwords with AES-256-GCM. Keep it safe and don't change it, or existing saved passwords become unreadable. If it is empty, `JWT_SECRET` is used instead.
	To enable reminder emails, set `EMAIL_USER` to the Gmail sender address and `EMAIL_PASS` to a Google app password. Without both values, the API starts normally but reminder email polling stays disabled.
3. Start MongoDB.
4. In one terminal, run `cd server && npm run dev` to start the API. It listens on port 3000 by default.
5. In another terminal, run `cd client && npm install && npm run dev` to start the React client.
6. Open the Vite URL printed in the client terminal.

The API requires MongoDB and returns `GET /api/health` for a health check. Authenticated endpoints use a bearer token returned by register/login. Uploaded files are stored under `UPLOAD_DIR` and are served only through an authenticated item endpoint. The maximum upload size is 10 MB; accepted types are PDF, JPG, PNG, and WEBP.

## Commands

- From `server/`, `npm test` runs the API tests and `npm start` starts the API after connecting to MongoDB.
- From `client/`, `npm run build` creates the production client bundle.

Reminder emails are checked once per minute after the database connects. Due, incomplete reminders are sent using the email address captured when the reminder was created. If the server was offline, overdue reminders are sent on the next check. Completed reminders are skipped.


## Saved passwords

Items of type **Password** store a username, an encrypted password and an optional website. Passwords are never returned in lists or item details; the client fetches one on demand from `GET /api/items/:id/secret` (owner only, `Cache-Control: no-store`), and it auto-hides after 30 seconds. The editor includes a strong-password generator.