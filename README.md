# Enterprise Builder AI

This project is a React web application built with [Vite](https://vitejs.dev/) and an [Express](https://expressjs.com/) backend.

## Prerequisites

- Node.js (v18+ recommended)
- Firebase Project (for Authentication and Firestore)
- Gemini API Key

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Variables:
   Copy `.env.example` to `.env` and fill in your variables:
   ```bash
   cp .env.example .env
   ```
   *Note: Ensure all your `VITE_FIREBASE_*` variables and `GEMINI_API_KEY` are populated.*

3. Start the development server:
   ```bash
   npm run dev
   ```

## Production Build

To build the project for production:

```bash
npm run build
```

This will run the Vite build and create a `dist` folder. If you intend to run the backend as well, you can start `server.ts` in production mode.
