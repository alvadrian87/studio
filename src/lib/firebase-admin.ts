
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration ensures that the SDK is initialized only once.
// It will use Application Default Credentials (ADC) on the server,
// which is the recommended approach for App Hosting and handles auth securely.
if (!getApps().length) {
  admin.initializeApp();
}

const db = admin.firestore();
const authAdmin = admin.auth();

export { db, authAdmin };
