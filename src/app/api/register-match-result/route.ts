
export const runtime = 'nodejs'; // <-- MUST BE NODE.JS

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Player, Match, Tournament, Challenge, Inscription } from '@/types';

// This is a helper function that can be used elsewhere if needed
const calculateElo = (playerRating: number, opponentRating: number, result: number) => {
  const kFactor = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  return playerRating + kFactor * (result - expectedScore);
};

// This is a helper function that can be moved to a separate file if it grows
const updateLadderPositions = async (params: { tournamentId: string, eventId: string, winnerId: string, loserId: string }) => {
    const { tournamentId, eventId, winnerId, loserId } = params;
    console.log('[LADDER_UPDATE_START] Starting position swap for event:', eventId);
    
    const inscriptionsRef = db.collection(`tournaments/${tournamentId}/inscriptions`);
    const winnerInscriptionQuery = inscriptionsRef.where('eventoId', '==', eventId).where('jugadorId', '==', winnerId).limit(1);
    const loserInscriptionQuery = inscriptionsRef.where('eventoId', '==', eventId).where('jugadorId', '==', loserId).limit(1);
      
    const [winnerSnapshots, loserSnapshots] = await Promise.all([
        winnerInscriptionQuery.get(),
        loserInscriptionQuery.get()
    ]);

    if (winnerSnapshots.empty) throw new Error(`No se encontró la inscripción para el ganador ${winnerId} en el evento ${eventId}.`);
    if (loserSnapshots.empty) throw new Error(`No se encontró la inscripción para el perdedor ${loserId} en el evento ${eventId}.`);

    const winnerInscriptionDoc = winnerSnapshots.docs[0];
    const loserInscriptionDoc = loserSnapshots.docs[0];
      
    const winnerPosition = (winnerInscriptionDoc.data() as Inscription).posicionActual;
    const loserPosition = (loserInscriptionDoc.data() as Inscription).posicionActual;

    console.log(`[LADDER_UPDATE_INFO] Swapping positions: Winner ${winnerId} (Pos ${winnerPosition}) <-> Loser ${loserId} (Pos ${loserPosition})`);

    const batch = db.batch();
    batch.update(winnerInscriptionDoc.ref, { posicionActual: loserPosition });
    batch.update(loserInscriptionDoc.ref, { posicionActual: winnerPosition });
      
    await batch.commit();
    console.log('[LADDER_UPDATE_SUCCESS] Positions swapped successfully.');
};


type Body = {
  matchId: string;
  winnerId: string;
  score: string;
  isRetirement: boolean;
};

export async function POST(req: Request) {
  try {
    const { matchId, winnerId, score, isRetirement } = (await req.json()) as Body;

    // --- 1. VALIDATIONS ---
    const matchRef = db.collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();
    if (!matchDoc.exists) {
      return NextResponse.json({ success: false, message: `Partido ${matchId} no encontrado.` }, { status: 404 });
    }

    const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
    if (matchData.status === 'Completado') {
      return NextResponse.json({ success: false, message: 'Este resultado ya ha sido registrado.' }, { status: 400 });
    }

    const loserId = matchData.player1Id === winnerId ? matchData.player2Id : matchData.player1Id;

    const winnerRef = db.collection('users').doc(winnerId);
    const loserRef  = db.collection('users').doc(loserId);
    const tournamentRef = db.collection('tournaments').doc(matchData.tournamentId);

    const [winnerDoc, loserDoc, tournamentDoc] = await Promise.all([
      winnerRef.get(), loserRef.get(), tournamentRef.get()
    ]);

    if (!winnerDoc.exists) return NextResponse.json({ success: false, message: `Jugador ganador con ID ${winnerId} no encontrado.` }, { status: 404 });
    if (!loserDoc.exists)  return NextResponse.json({ success: false, message: `Jugador perdedor con ID ${loserId} no encontrado.` }, { status: 404 });
    if (!tournamentDoc.exists) return NextResponse.json({ success: false, message: `Torneo con ID ${matchData.tournamentId} no encontrado.` }, { status: 404 });

    const winnerData = winnerDoc.data() as Player;
    const loserData = loserDoc.data() as Player;
    const tournamentData = tournamentDoc.data() as Tournament;

    // --- 2. CORE TRANSACTION ---
    await db.runTransaction(async (tx) => {
      tx.update(matchRef, {
        winnerId,
        status: 'Completado',
        score: isRetirement ? `${score} (Ret.)` : score,
      });
      tx.update(winnerRef, { globalWins: FieldValue.increment(1) });
      tx.update(loserRef,  { globalLosses: FieldValue.increment(1) });
    });
    
    // --- 3. POST-TRANSACTION LOGIC (Non-atomic but failsafe) ---
    const postTransactionPromises = [];
    
    // A) Update ELO if ranked
    if (tournamentData.isRanked) {
        console.log('[POST_TRANSACTION] Calculating and updating ELO...');
        const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
        const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);

        const batch = db.batch();
        batch.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
        batch.update(loserRef, { rankPoints: Math.round(loserNewRating) });
        postTransactionPromises.push(batch.commit().then(() => console.log('[POST_TRANSACTION] ELO points updated successfully.')));
    }
      
    // B) Update ladder positions if it's a ladder tournament and the challenger won
    if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && matchData.challengeId) {
       console.log(`[POST_TRANSACTION] Handling ladder logic for challenge: ${matchData.challengeId}`);
       const challengeRef = db.collection('challenges').doc(matchData.challengeId);
       const challengeDoc = await challengeRef.get();

       if(challengeDoc.exists) {
          const challengeData = challengeDoc.data() as Challenge;
          // Only swap if the challenger (retador) is the winner
          if (challengeData.retadorId === winnerId) {
              console.log('[POST_TRANSACTION] Challenger won. Triggering ladder position update...');
              postTransactionPromises.push(
                  updateLadderPositions({
                      tournamentId: matchData.tournamentId,
                      eventId: challengeData.eventoId,
                      winnerId: winnerId,
                      loserId: loserId,
                  }).catch(err => console.error("Ladder update failed:", err))
              );
          } else {
               console.log('[POST_TRANSACTION] Winner was the challenged player. No position change needed.');
          }
          // Update challenge status to 'Jugado' after the match is completed
          postTransactionPromises.push(challengeRef.update({ estado: 'Jugado' }).then(() => console.log('[POST_TRANSACTION] Challenge status updated to Jugado.')));
       } else {
          console.warn(`[POST_TRANSACTION_WARNING] Challenge document with ID ${matchData.challengeId} not found, but match was completed.`);
       }
    }
    
    // Wait for all post-transaction operations to complete
    await Promise.all(postTransactionPromises);

    return NextResponse.json({ success: true, message: 'Resultado guardado exitosamente.' });
  } catch (err: any) {
    console.error('[API register-match-result] Error:', err?.message, err?.stack);
    return NextResponse.json({ success: false, message: err?.message || 'Error interno del servidor.' }, { status: 500 });
  }
}

