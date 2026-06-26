import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Resolves Firebase Admin credentials.
 *
 * Preference order:
 *  1. Explicit service-account env vars (recommended for production / Vercel).
 *  2. Application default credentials, which honor GOOGLE_APPLICATION_CREDENTIALS
 *     (e.g. ./firebase-key.json for local development).
 */
function createApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys are stored with literal "\n" in env vars; restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  return initializeApp({ credential: applicationDefault() });
}

// Singleton: reuse the app across hot reloads / route invocations.
const app: App = getApps()[0] ?? createApp();

export const db: Firestore = getFirestore(app);
