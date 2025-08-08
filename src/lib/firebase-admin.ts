
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    // Para entornos locales, el emulador o variables de entorno configurarían esto.
    // En producción en Google Cloud, las credenciales se descubren automáticamente.
    const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'base64').toString('ascii'))
      : undefined;

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
        projectId: 'evoladder-manager',
    });
}

const db = admin.firestore();

export { db };
