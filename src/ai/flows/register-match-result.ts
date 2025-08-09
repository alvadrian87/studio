
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
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

export const registerMatchResult = ai.defineFlow(
  {
    name: 'registerMatchResultFlow',
    inputSchema: RegisterMatchResultInputSchema,
    outputSchema: RegisterMatchResultOutputSchema,
  },
  async ({ matchId, winnerId, score, isRetirement }) => {
    try {
        const db = getFirestore();
        
        await db.runTransaction(async (transaction) => {
            const matchRef = db.collection("matches").doc(matchId);
            const matchDoc = await transaction.get(matchRef);

            if (!matchDoc.exists) {
                throw new Error("La partida no fue encontrada.");
            }
            const matchData = matchDoc.data() as Match;

            if (matchData.status === 'Completado') {
                throw new Error("Este resultado ya ha sido registrado.");
            }

            const loserId = matchData.player1Id === winnerId ? matchData.player2Id : matchData.player1Id;

            const winnerRef = db.collection("users").doc(winnerId);
            const loserRef = db.collection("users").doc(loserId);
            const tournamentRef = db.collection("tournaments").doc(matchData.tournamentId);

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
            const tournamentData = tournamentDoc.data() as Tournament;

            // --- ALL WRITES ---
            transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: score });

            const newWinnerWins = (winnerData.globalWins || 0) + 1;
            const newLoserLosses = (loserData.globalLosses || 0) + 1;
            
            transaction.update(winnerRef, { globalWins: newWinnerWins });
            transaction.update(loserRef, { globalLosses: newLoserLosses });

            if (tournamentData.isRanked) {
                const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
                const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
                
                transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
                transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
            }

            if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && matchData.challengeId) {
                const challengeRef = db.collection("challenges").doc(matchData.challengeId);
                const challengeDoc = await transaction.get(challengeRef);
                
                if(!challengeDoc.exists()) {
                    // If the challenge doesn't exist, we can't proceed with the position swap.
                    // This is a safeguard against inconsistent data.
                    throw new Error("El desafío asociado a esta partida no fue encontrado. No se puede actualizar la clasificación de la escalera.");
                }
                const challengeData = challengeDoc.data() as Challenge;
                
                transaction.update(challengeRef, { estado: 'Jugado' });
                
                // Position Swap Logic
                if (winnerId === challengeData.retadorId) {
                    const inscriptionsRef = db.collection(`tournaments/${matchData.tournamentId}/inscriptions`);
                    
                    const retadorInscriptionQuery = inscriptionsRef.where('jugadorId', '==', challengeData.retadorId).where('eventoId', '==', challengeData.eventoId).limit(1);
                    const desafiadoInscriptionQuery = inscriptionsRef.where('jugadorId', '==', challengeData.desafiadoId).where('eventoId', '==', challengeData.eventoId).limit(1);

                    const [retadorSnapshot, desafiadoSnapshot] = await Promise.all([
                        transaction.get(retadorInscriptionQuery),
                        transaction.get(desafiadoInscriptionQuery)
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
                    
                    transaction.update(retadorInscriptionDoc.ref, { posicionActual: desafiadoPosition });
                    transaction.update(desafiadoInscriptionDoc.ref, { posicionActual: retadorPosition });
                }
            }
        });

      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("Error in registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
