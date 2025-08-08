
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import admin from 'firebase-admin';
import type { Player, Match, Tournament, Challenge, Inscription } from '@/types';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();


const RegisterMatchResultInputSchema = z.object({
  matchId: z.string().describe("The ID of the match to update."),
  winnerId: z.string().describe("The UID of the winning player."),
  score: z.string().describe("The final score string, e.g., '6-4, 6-4'."),
  isRetirement: z.boolean().describe("Whether the match ended due to a player retiring."),
});


const RegisterMatchResultOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

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
  async ({ matchId, winnerId, score }) => {
    try {
      await db.runTransaction(async (transaction) => {
        const matchRef = db.collection("matches").doc(matchId);
        const matchDoc = await transaction.get(matchRef);

        if (!matchDoc.exists) throw new Error("Match not found.");

        const matchData = matchDoc.data() as Match;
        const loserId = matchData.player1Id === winnerId ? matchData.player2Id : matchData.player1Id;

        const winnerRef = db.collection("users").doc(winnerId);
        const loserRef = db.collection("users").doc(loserId);
        const tournamentRef = db.collection("tournaments").doc(matchData.tournamentId);
        const challengeRef = matchData.challengeId ? db.collection("challenges").doc(matchData.challengeId) : null;

        const docs = await Promise.all([
          transaction.get(winnerRef),
          transaction.get(loserRef),
          transaction.get(tournamentRef),
          challengeRef ? transaction.get(challengeRef) : Promise.resolve(null),
        ]);
        
        const winnerDoc = docs[0];
        const loserDoc = docs[1];
        const tournamentDoc = docs[2];
        const challengeDoc = docs[3] as admin.firestore.DocumentSnapshot | null;
        
        if (!winnerDoc.exists || !loserDoc.exists || !tournamentDoc.exists) throw new Error("Player or tournament data not found.");
        
        const winnerData = winnerDoc.data() as Player;
        const loserData = loserDoc.data() as Player;
        const tournamentData = tournamentDoc.data() as Tournament;
        
        // Ladder logic
        if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && challengeDoc && challengeRef && challengeDoc.exists) {
            const challengeData = challengeDoc.data() as Challenge;

            if (challengeData.eventoId) {
                const inscriptionsRef = db.collection(`tournaments/${tournamentData.id}/inscriptions`);
                const qWinner = inscriptionsRef.where("jugadorId", "==", winnerId).where("eventoId", "==", challengeData.eventoId);
                const qLoser = inscriptionsRef.where("jugadorId", "==", loserId).where("eventoId", "==", challengeData.eventoId);
                
                const [winnerInscriptionsSnap, loserInscriptionsSnap] = await Promise.all([ transaction.get(qWinner), transaction.get(qLoser) ]);

                if (!winnerInscriptionsSnap.empty && !loserInscriptionsSnap.empty) {
                    const winnerInscriptionRef = winnerInscriptionsSnap.docs[0].ref;
                    const loserInscriptionRef = loserInscriptionsSnap.docs[0].ref;
                    const winnerInscriptionDoc = await transaction.get(winnerInscriptionRef);
                    const loserInscriptionDoc = await transaction.get(loserInscriptionRef);

                    if (winnerInscriptionDoc.exists && loserInscriptionDoc.exists) {
                        const winnerInscriptionData = winnerInscriptionDoc.data() as Inscription;
                        const loserInscriptionData = loserInscriptionDoc.data() as Inscription;
                        const challengerIsWinner = winnerId === challengeData.retadorId;
                        
                        if (challengerIsWinner && winnerInscriptionData.posicionActual > loserInscriptionData.posicionActual) {
                            const winnerOldPosition = winnerInscriptionData.posicionActual;
                            const loserOldPosition = loserInscriptionData.posicionActual;
                            transaction.update(winnerInscriptionRef, { posicionActual: loserOldPosition });
                            transaction.update(loserInscriptionRef, { posicionActual: winnerOldPosition });
                        }
                    }
                }
            }
            transaction.update(challengeRef, { estado: 'Jugado' });
        }
        
        // Update stats
        const newWinnerWins = (winnerData.globalWins || 0) + 1;
        const newLoserLosses = (loserData.globalLosses || 0) + 1;
        
        transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: score });
        transaction.update(winnerRef, { globalWins: newWinnerWins });
        transaction.update(loserRef, { globalLosses: newLoserLosses });

        // Update ELO if ranked
        if (tournamentData.isRanked) {
          const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
          const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
          
          transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
          transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
        }
      });
      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("Error in registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
