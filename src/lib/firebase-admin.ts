
// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

declare global {
  // evita re-init en dev hot-reload
  // eslint-disable-next-line no-var
  var __FIREBASE_ADMIN_APP__: admin.app.App | undefined;
}

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) return undefined;
  // Vercel/ENV suele guardar el \n escapado, lo normalizamos
  return key.replace(/\\n/g, '\n');
}

if (!global.__FIREBASE_ADMIN_APP__) {
  const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const PRIVATE_KEY = getPrivateKey();
  const SA_JSON = process.env.FIREBASE_SERVICE_ACCOUNT; // opcional: JSON entero

  if (SA_JSON) {
    // Opción A: variable con el JSON completo del service account
    global.__FIREBASE_ADMIN_APP__ = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(SA_JSON)),
      projectId: PROJECT_ID,
    });
    console.log('[firebase-admin] init with FIREBASE_SERVICE_ACCOUNT');
  } else if (PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY) {
    // Opción B: 3 variables separadas (recomendado en Vercel)
    global.__FIREBASE_ADMIN_APP__ = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: PROJECT_ID,
        clientEmail: CLIENT_EMAIL,
        privateKey: PRIVATE_KEY,
      }),
      projectId: PROJECT_ID,
    });
    console.log('[firebase-admin] init with env (PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY)');
  } else {
    // Opción C: fallback a ADC (solo si estás en GCP con permisos)
    console.warn('[firebase-admin] Attempting to initialize with Application Default Credentials (ADC). This is not recommended for production outside of GCP environments.');
    try {
        global.__FIREBASE_ADMIN_APP__ = admin.initializeApp();
        console.log('[firebase-admin] init with ADC (GOOGLE_APPLICATION_CREDENTIALS or GCP metadata)');
    } catch (e: any) {
        console.error('[firebase-admin] ADC initialization failed. Please set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables.', e);
    }
  }
}

const app = global.__FIREBASE_ADMIN_APP__!;
export const db = admin.firestore(app);
export const authAdmin = admin.auth(app);
export default app;
