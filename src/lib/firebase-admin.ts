
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // Si GOOGLE_APPLICATION_CREDENTIALS está configurado, se usará.
      // Si no, en un entorno de Google Cloud (App Hosting, Cloud Functions), 
      // las credenciales se descubren automáticamente.
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
