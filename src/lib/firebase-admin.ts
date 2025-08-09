
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// This configuration will use Application Default Credentials (ADC)
// on the server, which is the recommended approach for App Hosting.
const firebaseAdminConfig = {
  projectId: process.env.GCLOUD_PROJECT || 'evoladder-manager',
};

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  admin.initializeApp(firebaseAdminConfig);
}

// Export the initialized admin instance
const db = admin.firestore();
const authAdmin = admin.auth();

export { admin, db, authAdmin };
