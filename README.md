# MemoryBox

A personal information manager for documents, receipts, notes, links, and reminders.

## Requirements

- Node.js 20 or newer
- MongoDB 7 or newer

## Local setup

1. Install the API dependencies with `cd server && npm install`.
2. Create the server environment file with `cd server && cp .env.example .env`. Set `MONGODB_URI` to your MongoDB connection string and `JWT_SECRET` to a long random value in `server/.env`.
3. Start MongoDB.
4. In one terminal, run `cd server && npm run dev` to start the API. It listens on port 3000 by default.
5. In another terminal, run `cd client && npm install && npm run dev` to start the React client.
6. Open the Vite URL printed in the client terminal.

The API requires MongoDB and returns `GET /api/health` for a health check. Authenticated endpoints use a bearer token returned by register/login. Uploaded files are stored under `UPLOAD_DIR` and are served only through an authenticated item endpoint. The maximum upload size is 10 MB; accepted types are PDF, JPG, PNG, and WEBP.

## Commands

- From `server/`, `npm test` runs the API tests and `npm start` starts the API after connecting to MongoDB.
- From `client/`, `npm run build` creates the production client bundle.
