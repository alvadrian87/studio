

"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, DocumentData, QueryDocumentSnapshot, FirestoreError, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Player, Match, Tournament, TournamentEvent, Challenge, Result, Team, Inscription } from '@/types';


// Hook to get a collection
export function useCollection<T extends DocumentData>(collectionPath: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    // This allows passing a path like 'tournaments/xyz/inscriptions'
    const ref = collection(db, collectionPath);
    
    const unsubscribe = onSnapshot(ref, (querySnapshot) => {
      const documents: T[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(documents);
      setLoading(false);
    }, (err: FirestoreError) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionPath]);

  return { data, loading, error };
}

// Hook to get a single document
export function useDocument<T extends DocumentData>(docPath: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!docPath || docPath.includes('dummy')) {
        setLoading(false);
        setData(null);
        return;
    }
    const docRef = doc(db, docPath);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData({ id: docSnap.id, ...docSnap.data() } as T);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (err: FirestoreError) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docPath]);

  return { data, loading, error };
}

    