'use client';

import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  projectId: 'evoladder-manager',
  appId: '1:238462451076:web:4ce01e915936a57fe2f1d1',
  storageBucket: 'evoladder-manager.firebasestorage.app',
  apiKey: 'AIzaSyDUHYFdp_A-k0GBzA2ObGbHOH4auBEfT8c',
  authDomain: 'evoladder-manager.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '238462451076',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.log('La persistencia de Firestore falló debido a múltiples pestañas abiertas.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.log('El navegador actual no soporta la persistencia sin conexión de Firestore.');
    }
  });


export {app, auth, db};