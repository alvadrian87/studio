
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
  async ({ matchId, winnerId, score, isRetirement }) => {
    console.log('registerMatchResultFlow invoked with input:', { matchId, winnerId, score, isRetirement });
    try {
      await db.runTransaction(async (transaction) => {
        console.log('Starting database transaction...');
        const matchRef = db.collection("matches").doc(matchId);
        const matchDoc = await transaction.get(matchRef);
        console.log('Match document fetched.');

        if (!matchDoc.exists) {
            console.error("Match not found in transaction.");
            throw new Error("Match not found.");
        }

        const matchData = matchDoc.data() as Match;
        if(matchData.status === 'Completado') {
          console.log("Match status is already 'Completado'. Aborting.");
          return;
        }

        const loserId = matchData.player1Id === winnerId ? matchData.player2Id : matchData.player1Id;
        console.log(`Winner: ${winnerId}, Loser: ${loserId}`);

        const winnerRef = db.collection("users").doc(winnerId);
        const loserRef = db.collection("users").doc(loserId);
        const tournamentRef = db.collection("tournaments").doc(matchData.tournamentId);
        
        console.log('Fetching winner, loser, and tournament documents.');
        const docsToGet = [winnerRef, loserRef, tournamentRef];
        const [winnerDoc, loserDoc, tournamentDoc] = await transaction.getAll(...docsToGet);
        console.log('Winner, loser, and tournament documents fetched.');
        
        if (!winnerDoc.exists || !loserDoc.exists || !tournamentDoc.exists) {
            console.error("Player or tournament data not found in transaction.");
            throw new Error("Player or tournament data not found.");
        }
        
        const winnerData = winnerDoc.data() as Player;
        const loserData = loserDoc.data() as Player;
        const tournamentData = tournamentDoc.data() as Tournament;
        
        // Ladder logic
        if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && matchData.challengeId) {
            console.log('Executing ladder logic for challenge ID:', matchData.challengeId);
            const challengeRef = db.collection("challenges").doc(matchData.challengeId);
            const challengeDoc = await transaction.get(challengeRef);

            if (challengeDoc.exists) {
                console.log('Challenge document found.');
                const challengeData = challengeDoc.data() as Challenge;
                if (challengeData.eventoId) {
                    console.log('Challenge has eventoId:', challengeData.eventoId);
                    const inscriptionsRef = db.collection(`tournaments/${tournamentData.id}/inscriptions`);
                    const qWinner = inscriptionsRef.where("jugadorId", "==", winnerId).where("eventoId", "==", challengeData.eventoId).limit(1);
                    const qLoser = inscriptionsRef.where("jugadorId", "==", loserId).where("eventoId", "==", challengeData.eventoId).limit(1);
                    
                    console.log('Fetching winner and loser inscriptions.');
                    const [winnerInscriptionsSnap, loserInscriptionsSnap] = await Promise.all([ transaction.get(qWinner), transaction.get(qLoser) ]);
                    console.log('Winner and loser inscriptions fetched.');

                    if (!winnerInscriptionsSnap.empty && !loserInscriptionsSnap.empty) {
                        console.log('Both winner and loser inscriptions found.');
                        const winnerInscriptionRef = winnerInscriptionsSnap.docs[0].ref;
                        const loserInscriptionRef = loserInscriptionsSnap.docs[0].ref;
                        const winnerInscriptionData = winnerInscriptionsSnap.docs[0].data() as Inscription;
                        const loserInscriptionData = loserInscriptionsSnap.docs[0].data() as Inscription;
                        const challengerIsWinner = winnerId === challengeData.retadorId;
                            
                        if (challengerIsWinner && winnerInscriptionData.posicionActual > loserInscriptionData.posicionActual) {
                            console.log('Swapping positions.');
                            const winnerOldPosition = winnerInscriptionData.posicionActual;
                            const loserOldPosition = loserInscriptionData.posicionActual;
                            transaction.update(winnerInscriptionRef, { posicionActual: loserOldPosition });
                            transaction.update(loserInscriptionRef, { posicionActual: winnerOldPosition });
                        }
                    }
                }
                transaction.update(challengeRef, { estado: 'Jugado' });
                console.log('Challenge status updated to "Jugado".');
            }
        }
        
        // Update stats
        console.log('Updating player stats.');
        const newWinnerWins = (winnerData.globalWins || 0) + 1;
        const newLoserLosses = (loserData.globalLosses || 0) + 1;
        
        transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: score });
        transaction.update(winnerRef, { globalWins: newWinnerWins });
        transaction.update(loserRef, { globalLosses: newLoserLosses });
        console.log('Player stats updated in transaction.');


        // Update ELO if ranked
        if (tournamentData.isRanked) {
          console.log('Tournament is ranked. Calculating and updating ELO.');
          const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
          const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
          
          transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
          transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
          console.log('ELO points updated in transaction.');
        }

        console.log('Transaction updates prepared. Committing...');
      });
      console.log('Transaction successfully committed.');
      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("Error in registerMatchResultFlow transaction: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
