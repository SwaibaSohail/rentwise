import admin from "firebase-admin";
import { env } from "../config/env";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // .env stores the key with literal \n; restore real newlines.
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export const firebaseAuth = admin.auth();

/**
 * Verify a `Bearer <token>` Authorization header.
 * Returns the Firebase uid/email, or null if missing/invalid.
 */
export async function getVerifiedUid(
  authHeader?: string
): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await firebaseAuth.verifyIdToken(authHeader.slice("Bearer ".length));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
