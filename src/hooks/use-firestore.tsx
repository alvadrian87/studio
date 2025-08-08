
"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, DocumentData, QueryDocumentSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Type definitions based on your data structure
export interface Player {
  id: string; // This will be the document's ID
  uid: string; // This is the user's UID from auth
  firstName: string;
  lastName: string;
  displayName: string; // Combination of first and last name
  email: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  residence: string;
  dominantHand?: string;
  club?: string;
  avatar?: string;
  role: 'player' | 'admin';
  globalWins: number;
  globalLosses: number;
  rankPoints: number; // ELO-like ranking points
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  status: 'Pendiente' | 'Completado' | 'En Progreso';
  date: string;
  tournamentId: string;
}

export interface Tournament {
  id: string;
  creatorId: string;
  status: 'Próximo' | 'En Curso' | 'Completado' | 'Borrador';
  // Step 1
  tipoTorneo: 'Individual' | 'Por Equipos';
  nombreTorneo: string;
  descripcion?: string;
  organizacion: string;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  imagenBannerUrl?: string;
  // Step 3
  fechaInicioInscripciones: string;
  fechaCierreInscripciones: string;
  maximoInscripciones?: number;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono?: string;
}

export interface TournamentEvent {
    id?: string; // ID is optional because it might not exist on creation
    torneoId?: string; 
    nombre: string; 
    formatoTorneo: 'Single Elimination' | 'Round Robin' | 'First Match Backdraw' | 'Ladder' | '';
    // Individual
    tipoDeJuego?: 'Singles' | 'Dobles';
    sexo?: 'Femenino' | 'Masculino' | 'Mixto' | 'Abierto';
    edadMinima?: number;
    edadMaxima?: number;
    eloMinimo?: number;
    eloMaximo?: number;
    tarifaInscripcion?: number;
    // Equipos
    numJugadoresPorEquipo?: number;
    configuracionRonda?: string;
    eloMinimoEquipo?: number;
    eloMaximoEquipo?: number;
    tarifaInscripcionEquipo?: number;
}


export interface Challenge {
    id: string;
    challengerId: string;
    challengedId: string;
    tournamentId: string;
    tournamentName: string;
    status: 'Pendiente' | 'Aceptado' | 'Rechazado';
    date: string;
}

export interface Team {
  id: string;
  torneoId: string;
  eventoId: string;
  nombreEquipo: string;
  capitanId: string; // player uid
  jugadoresIds: string[]; // array of player uids
}

export interface Inscription {
  id: string;
  torneoId: string;
  eventoId: string;
  jugadorId: string; // player uid
  equipoId?: string; // if team tournament
  fechaInscripcion: string;
  status: 'Confirmado' | 'En Espera';
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
