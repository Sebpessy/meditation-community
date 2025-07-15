import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
let adminApp;
try {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  adminApp = null;
}

export const adminAuth = adminApp ? getAuth(adminApp) : null;

export async function deleteFirebaseUser(firebaseUid: string): Promise<boolean> {
  if (!adminAuth) {
    console.error('Firebase Admin SDK not initialized');
    return false;
  }

  try {
    await adminAuth.deleteUser(firebaseUid);
    console.log('Successfully deleted user from Firebase Auth:', firebaseUid);
    return true;
  } catch (error) {
    console.error('Error deleting user from Firebase Auth:', error);
    return false;
  }
}