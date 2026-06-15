import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config/env";

function getFirebaseApp() {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // .env stores the key with literal \n; restore real newlines.
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Verify a `Bearer <token>` Authorization header.
 * Returns the Firebase uid/email, or null if missing/invalid.
 */
export async function getVerifiedUid(
  authHeader?: string
): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const auth = getAuth(getFirebaseApp());
    const decoded = await auth.verifyIdToken(authHeader.slice("Bearer ".length));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
