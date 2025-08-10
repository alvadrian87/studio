// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

declare global {
  // evita re-init en dev hot-reload
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: admin.app.App | undefined;
}

if (!global.__FIREBASE_ADMIN_APP__) {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountString) {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      global.__FIREBASE_ADMIN_APP__ = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('[firebase-admin] Initialized with FIREBASE_SERVICE_ACCOUNT');
    } catch (e: any) {
      console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
      console.error('[firebase-admin] Make sure the environment variable contains a valid JSON string.');
    }
  } else {
     console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT is not set. Attempting to initialize with Application Default Credentials (ADC). This is not recommended for production outside of GCP environments.');
     try {
        global.__FIREBASE_ADMIN_APP__ = admin.initializeApp();
        console.log('[firebase-admin] init with ADC (GOOGLE_APPLICATION_CREDENTIALS or GCP metadata)');
    } catch (e: any) {
        console.error('[firebase-admin] ADC initialization failed. Please set FIREBASE_SERVICE_ACCOUNT environment variable.', e);
    }
  }
}

const app = global.__FIREBASE_ADMIN_APP__!;
export const db = admin.firestore(app);
export const authAdmin = admin.auth(app);
export default app;
