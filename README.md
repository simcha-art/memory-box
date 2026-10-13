# MemoryBox

**A private home for the details worth keeping.**

MemoryBox is a personal archive for organizing important documents, receipts, notes, links, passwords, and reminders. It combines a React web app with an Express API and MongoDB, with support for email verification, responsive layouts, and English and Hebrew interfaces.

## Features

- Save and organize documents, receipts, notes, links, images, and passwords.
- Search saved items and group them with categories and tags.
- Upload and securely retrieve supported files.
- Store passwords encrypted and reveal them only on demand.
- Create reminders with repeat schedules and email notifications.
- Register and sign in with email verification and password recovery.
- Browse reminders on a calendar and manage accounts from the admin panel.
- Switch between English and Hebrew, light and dark themes.

## Tech stack

| Area | Technologies |
| --- | --- |
| Client | React 19, TypeScript, Vite, React Router |
| API | Node.js, Express 5, Mongoose |
| Database | MongoDB |
| Validation and security | Zod, Helmet, CORS, bcrypt, JWT |
| Testing | Vitest, Testing Library, Supertest, MongoDB Memory Server |

## Requirements

- Node.js 20 or newer (CI uses Node.js 22)
- npm
- MongoDB 7 or newer, local or hosted

## Get started

### 1. Configure the API

Install dependencies:

```sh
npm ci --prefix server
```

Create `server/.env` by copying `server/.env.example`. On macOS or Linux:

```sh
cp server/.env.example server/.env
```

In PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

Set at least `MONGODB_URI` and `JWT_SECRET` in `server/.env`. Use a strong, unique value for `JWT_SECRET`.

| Variable | Purpose | Default / required |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | Signs authentication tokens and is the fallback encryption key | Required |
| `ENCRYPTION_KEY` | Dedicated key for encrypting saved passwords | Optional; uses `JWT_SECRET` if empty |
| `PORT` | API listening port | `3000` |
| `CORS_ORIGIN` | Comma-separated allowed client origins | `http://localhost:5173` |
| `CLIENT_URL` | Client base URL used in verification, reset, and reminder emails | `http://localhost:5173` |
| `UPLOAD_DIR` | Directory for uploaded files | `server/uploads` when started from `server/` |
| `ADMIN_EMAILS` | Comma-separated email addresses granted the admin role | None |
| `EMAIL_USER` | Gmail address used to send application emails | Optional |
| `EMAIL_PASS` | Gmail app password used for SMTP | Optional |
| `TRUST_PROXY` | Express proxy-trust setting, when deployed behind a proxy | None |

Keep `ENCRYPTION_KEY` safe and stable. Changing it makes passwords previously encrypted with that key unreadable. If it is unset, password encryption uses `JWT_SECRET`; changing that secret also affects access to saved passwords.

Set both `EMAIL_USER` and `EMAIL_PASS` to enable email verification, password recovery, and scheduled reminder emails. For Gmail, use an app password. Without email credentials, the API can run, but it cannot deliver those emails.

### 2. Start MongoDB and the API

Start your MongoDB service, then run:

```sh
npm run dev --prefix server
```

The API listens on `http://localhost:3000` by default. Check it at [`http://localhost:3000/api/health`](http://localhost:3000/api/health).

### 3. Start the client

In another terminal:

```sh
npm ci --prefix client
npm run dev --prefix client
```

Open the Vite development URL shown in the terminal (typically `http://localhost:5173`). The client uses `http://localhost:3000/api` by default. To use a different API URL, set `VITE_API_URL` in `client/.env`.

## Development commands

Run commands from the repository root unless otherwise noted.

| Command | Description |
| --- | --- |
| `npm run test:all` | Run the server and client test suites |
| `npm run test:coverage` | Run both suites and generate coverage reports |
| `npm run test:ci` | Run tests with coverage gates, then build the client |
| `npm test --prefix server` | Run API tests |
| `npm test --prefix client` | Run client tests |
| `npm run test:watch --prefix server` | Run API tests in watch mode |
| `npm run test:watch --prefix client` | Run client tests in watch mode |
| `npm start --prefix server` | Start the API without file watching |
| `npm run build --prefix client` | Type-check and build the production client |
| `npm run preview --prefix client` | Preview the production client build |

Coverage reports are written to `server/coverage/` and `client/coverage/`. Open each directory's `index.html` for the detailed report. CI enforces separate minimums:

| Project | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Server | 60% | 45% | 60% | 65% |
| Client | 45% | 25% | 40% | 45% |

GitHub Actions runs `npm run test:ci` on every push and pull request. API integration tests use an ephemeral MongoDB instance and mock outgoing email; they do not require your local database or email credentials.

## API overview

All API routes are under `/api`. User data endpoints require a bearer token; admin endpoints also require an administrator account.

| Route group | Purpose |
| --- | --- |
| `/api/auth` | Registration, sign-in, email verification, password recovery, current-user session |
| `/api/items` | Saved items, search, related items, file access, password reveal |
| `/api/categories` | User categories |
| `/api/reminders` | Reminder management and upcoming reminders |
| `/api/admin` | Administrator-only account management |
| `/api/health` | API health check |

## Security and data handling

- Account passwords are hashed before storage.
- Saved item passwords are encrypted at rest and are not included in item lists or item details. They are retrieved through an owner-only endpoint with `Cache-Control: no-store`.
- Uploaded files are limited to 10 MB and validated against supported file types. Downloads are served through authenticated endpoints.
- Email verification is required before a new account can sign in.
- The API applies Helmet security headers, origin-based CORS, request validation, and rate limits on sensitive authentication operations.
- Uploaded files are stored in `UPLOAD_DIR`; protect and back up that directory along with your database.

## Reminder emails

When Gmail credentials are configured and the API is connected to MongoDB, the reminder scheduler checks for due reminders once per minute. It sends pending reminders to the email address saved with each reminder. Completed reminders are skipped; overdue reminders are picked up when the service runs again.

## Project layout

```text
.
├── client/                 # React application, UI, and client tests
├── server/                 # Express API, database models, and API tests
├── .github/workflows/      # CI workflows
├── package.json            # Root-level test and CI commands
└── README.md
```
