
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration will use Application Default Credentials (ADC)
// on the server, which is the recommended approach for App Hosting.
// It automatically handles authentication, including App Check.
if (!getApps().length) {
  admin.initializeApp();
}

// Export the initialized admin instance and its services
const db = admin.firestore();
const authAdmin = admin.auth();

export { admin, db, authAdmin };
