'use client';

import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';

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

export {app, auth};
