# MemoryBox

A personal information manager for documents, receipts, notes, links, and reminders.

## Requirements

- Node.js 20 or newer
- MongoDB 7 or newer

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `JWT_SECRET` to a long random value.
3. Start MongoDB locally.
4. Start the API with `npm run dev` and the client with `npm run dev:client`.
5. Open the Vite URL printed in the client terminal. The API listens on port 3000.

The API requires MongoDB and returns `GET /api/health` for a health check. Authenticated endpoints use a bearer token returned by register/login. Uploaded files are stored under `UPLOAD_DIR` and are served only through an authenticated item endpoint. The maximum upload size is 10 MB; accepted types are PDF, JPG, PNG, and WEBP.

## Commands

- `npm test` runs the API and client tests.
- `npm run build` creates the production client bundle.
- `npm start` starts the API after connecting to MongoDB.
