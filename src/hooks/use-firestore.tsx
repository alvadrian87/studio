"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, DocumentData, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Type definitions based on your data structure
export interface Player {
  id: string;
  name: string;
  rank: number;
  wins: number;
  losses: number;
  avatar: string;
}

export interface Match {
  id: string;
  player1: Player;
  player2: Player;
  winnerId: string | null;
  status: 'Pendiente' | 'Completado' | 'En Progreso';
  date: string;
}

export interface Tournament {
  id: string;
  name: string;
  format: 'Eliminación Simple' | 'Doble Eliminación' | 'Round Robin';
  location: string;
  status: 'Próximo' | 'En Curso' | 'Completado';
  startDate: string;
}

export interface Challenge {
    id: string;
    from: Player;
    to: Player;
    status: 'Pendiente' | 'Aceptado' | 'Rechazado';
}


// Hook to get a collection
export function useCollection<T extends DocumentData>(collectionName: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    const q = collection(db, collectionName);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
  }, [collectionName]);

  return { data, loading, error };
}

// Hook to get a single document
export function useDocument<T extends DocumentData>(docPath: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
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
