
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Player, Match, Tournament, Challenge, Inscription } from '@/types';
import admin from 'firebase-admin';

// Safely initialize the Firebase Admin SDK.
// This is the standard pattern for server-side Firebase in Next.js.
if (!admin.apps.length) {
  admin.initializeApp();
}

const RegisterMatchResultInputSchema = z.object({
  matchId: z.string().describe("The ID of the match to update."),
  winnerId: z.string().describe("The UID of the winning player."),
  score: z.string().describe("The final score string, e.g., '6-4, 6-4'."),
  isRetirement: z.boolean().describe("Whether the match ended due to a player retiring."),
});
export type RegisterMatchResultInput = z.infer<typeof RegisterMatchResultInputSchema>;

const RegisterMatchResultOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type RegisterMatchResultOutput = z.infer<typeof RegisterMatchResultOutputSchema>;


const calculateElo = (playerRating: number, opponentRating: number, result: number) => {
    const kFactor = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return playerRating + kFactor * (result - expectedScore);
};

async function updateLadderPositions(db: admin.firestore.Firestore, matchData: Match, winnerId: string) {
    console.log(`[LADDER_UPDATE] Iniciando actualización de escalera para la partida: ${matchData.id}`);
    if (!matchData.challengeId || !matchData.tournamentId) {
        console.warn(`[LADDER_UPDATE] La partida ${matchData.id} no tiene ID de desafío o torneo. Saltando actualización de escalera.`);
        return;
    }

    const batch = db.batch();

    // 1. Actualizar estado del desafío
    const challengeRef = db.collection("challenges").doc(matchData.challengeId);
    const challengeDoc = await challengeRef.get();
    if (!challengeDoc.exists) {
        console.warn(`[LADDER_UPDATE] Desafío ${matchData.challengeId} no encontrado para la partida ${matchData.id}. Saltando actualización.`);
        return; 
    }
    const challengeData = challengeDoc.data() as Challenge;
    batch.update(challengeRef, { estado: 'Jugado' });
    console.log(`[LADDER_UPDATE] Desafío ${challengeData.id} marcado como 'Jugado'.`);
    
    // 2. Lógica de intercambio de posiciones solo si el retador gana
    if (winnerId === challengeData.retadorId) {
        console.log(`[LADDER_UPDATE] El retador ${winnerId} ganó. Iniciando intercambio de posiciones.`);
        const inscriptionsRef = db.collection(`tournaments/${matchData.tournamentId}/inscriptions`);
        
        const retadorInscriptionQuery = inscriptionsRef.where('jugadorId', '==', challengeData.retadorId).where('eventoId', '==', challengeData.eventoId).limit(1);
        const desafiadoInscriptionQuery = inscriptionsRef.where('jugadorId', '==', challengeData.desafiadoId).where('eventoId', '==', challengeData.eventoId).limit(1);

        const [retadorSnapshot, desafiadoSnapshot] = await Promise.all([
            retadorInscriptionQuery.get(),
            desafiadoInscriptionQuery.get()
        ]);
        
        if (retadorSnapshot.empty || desafiadoSnapshot.empty) {
            throw new Error("No se encontraron las inscripciones de los jugadores para el intercambio de posiciones.");
        }

        const retadorInscriptionDoc = retadorSnapshot.docs[0];
        const desafiadoInscriptionDoc = desafiadoSnapshot.docs[0];
        const retadorInscriptionData = retadorInscriptionDoc.data() as Inscription;
        const desafiadoInscriptionData = desafiadoInscriptionDoc.data() as Inscription;
        
        const retadorPosition = retadorInscriptionData.posicionActual;
        const desafiadoPosition = desafiadoInscriptionData.posicionActual;
        
        console.log(`[LADDER_UPDATE] Intercambiando posiciones: Retador (${retadorPosition}) <-> Desafiado (${desafiadoPosition})`);
        
        // Realizar el intercambio
        batch.update(retadorInscriptionDoc.ref, { posicionActual: desafiadoPosition });
        batch.update(desafiadoInscriptionDoc.ref, { posicionActual: retadorPosition });
    } else {
         console.log(`[LADDER_UPDATE] El desafiado ${winnerId} ganó. No hay intercambio de posiciones.`);
    }

    await batch.commit();
    console.log(`[LADDER_UPDATE] Actualización de la escalera completada para la partida: ${matchData.id}`);
}


export const registerMatchResult = ai.defineFlow(
  {
    name: 'registerMatchResultFlow',
    inputSchema: RegisterMatchResultInputSchema,
    outputSchema: RegisterMatchResultOutputSchema,
  },
  async ({ matchId, winnerId, score, isRetirement }) => {
    console.log(`[REGISTER_RESULT] Iniciando flujo para la partida: ${matchId}`);
    const db = getFirestore();
    let matchDataForPostLogic: Match | null = null;
    let tournamentDataForPostLogic: Tournament | null = null;
    let needsLadderUpdate = false;

    try {
        console.log("[REGISTER_RESULT] Iniciando transacción en la base de datos...");
        await db.runTransaction(async (transaction) => {
            const matchRef = db.collection("matches").doc(matchId);
            const matchDoc = await transaction.get(matchRef);

            if (!matchDoc.exists) {
                throw new Error("La partida no fue encontrada.");
            }
            const localMatchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
            matchDataForPostLogic = localMatchData;

            if (localMatchData.status === 'Completado') {
                throw new Error("Este resultado ya ha sido registrado.");
            }

            const loserId = localMatchData.player1Id === winnerId ? localMatchData.player2Id : localMatchData.player1Id;

            const winnerRef = db.collection("users").doc(winnerId);
            const loserRef = db.collection("users").doc(loserId);
            const tournamentRef = db.collection("tournaments").doc(localMatchData.tournamentId);

            const [winnerDoc, loserDoc, tournamentDoc] = await Promise.all([
                transaction.get(winnerRef),
                transaction.get(loserRef),
                transaction.get(tournamentRef)
            ]);

            if (!winnerDoc.exists() || !loserDoc.exists() || !tournamentDoc.exists()) {
                throw new Error("No se pudieron encontrar los datos del jugador o del torneo.");
            }

            const winnerData = winnerDoc.data() as Player;
            const loserData = loserDoc.data() as Player;
            const localTournamentData = tournamentDoc.data() as Tournament;
            tournamentDataForPostLogic = localTournamentData;
            
            transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: score });
            
            const newWinnerWins = (winnerData.globalWins || 0) + 1;
            const newLoserLosses = (loserData.globalLosses || 0) + 1;
            transaction.update(winnerRef, { globalWins: newWinnerWins });
            transaction.update(loserRef, { globalLosses: newLoserLosses });

            if (localTournamentData.isRanked) {
                const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
                const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
                
                transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
                transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
            }

            if (localTournamentData.tipoTorneo === 'Evento tipo Escalera' && localMatchData.challengeId) {
                needsLadderUpdate = true;
            }
        });
        console.log("[REGISTER_RESULT] Transacción completada exitosamente.");

      if (needsLadderUpdate && matchDataForPostLogic) {
         await updateLadderPositions(db, matchDataForPostLogic, winnerId);
      }
      
      console.log(`[REGISTER_RESULT] Flujo completado exitosamente para la partida: ${matchId}.`);
      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("[REGISTER_RESULT] Error en registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
