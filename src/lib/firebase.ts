
'use client';

import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: 'evoladder-manager',
  appId: '1:238462451076:web:4ce01e915936a57fe2f1d1',
  storageBucket: 'evoladder-manager.appspot.com',
  apiKey: 'AIzaSyDUHYFdp_A-k0GBzA2ObGbHOH4auBEfT8c',
  authDomain: 'evoladder-manager.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '238462451076',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {app, auth, db, storage};
