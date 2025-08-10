
import admin from 'firebase-admin';

// Initialize the SDK if it hasn't been already.
// This pattern ensures that we don't try to initialize the app more than once.
// In a serverless environment like App Hosting, this will use Application Default Credentials (ADC)
// to securely authenticate with Firebase and other Google Cloud services.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const authAdmin = admin.auth();

export { db, authAdmin };
