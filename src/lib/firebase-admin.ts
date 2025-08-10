
import admin from 'firebase-admin';

// Re-estructurado para usar la variable de entorno como fuente única de verdad para las credenciales.
const serviceAccountKey = process.env.FIREBASE_ADMIN_KEY;

if (!serviceAccountKey) {
  throw new Error('La variable de entorno FIREBASE_ADMIN_KEY no está configurada. Por favor, añade el JSON de tu cuenta de servicio.');
}

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
    });
  }
} catch (error: any) {
  console.error('Error al inicializar Firebase Admin SDK:', error.message);
  throw new Error('Las credenciales de Firebase Admin no son válidas. Revisa el contenido de FIREBASE_ADMIN_KEY.');
}

const db = admin.firestore();
const authAdmin = admin.auth();

export { db, authAdmin };
