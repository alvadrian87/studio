
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    // En un entorno de Google Cloud (como App Hosting), las credenciales se 
    // descubren automáticamente, por lo que no es necesario pasar argumentos.
    admin.initializeApp();
}

const db = admin.firestore();

export { db };
