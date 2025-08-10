
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin'; 
import { FieldValue } from 'firebase-admin/firestore';
import type { Player, Match, Tournament, Challenge, Inscription } from '@/types';
import { updateLadderPositions } from './update-ladder-positions';

console.log('[FLOW_LOAD] register-match-result.ts loaded.');

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
    console.log('[FLOW_START] registerMatchResultFlow started with payload:', { matchId, winnerId, score, isRetirement });
    
    try {
      // 1. VALIDATE DOCUMENTS EXISTENCE BEFORE THE TRANSACTION
      console.log(`[DEBUG] Looking for match: ${matchId}`);
      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();
      if (!matchDoc.exists) {
        throw new Error(`Partido con ID ${matchId} no encontrado.`);
      }
      const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;

      if (matchData.status === 'Completado') {
        throw new Error("Este resultado ya ha sido registrado.");
      }

      const loserId = matchData.player1Id === winnerId ? matchData.player2Id : matchData.player1Id;
      
      console.log(`[DEBUG] Looking for winner: ${winnerId}`);
      const winnerRef = db.collection("users").doc(winnerId);
      console.log(`[DEBUG] Looking for loser: ${loserId}`);
      const loserRef = db.collection("users").doc(loserId);
      console.log(`[DEBUG] Looking for tournament: ${matchData.tournamentId}`);
      const tournamentRef = db.collection("tournaments").doc(matchData.tournamentId);

      const [winnerDoc, loserDoc, tournamentDoc] = await Promise.all([
          winnerRef.get(),
          loserRef.get(),
          tournamentRef.get()
      ]);

      if (!winnerDoc.exists) throw new Error(`Jugador ganador con ID ${winnerId} no encontrado.`);
      if (!loserDoc.exists) throw new Error(`Jugador perdedor con ID ${loserId} no encontrado.`);
      if (!tournamentDoc.exists()) throw new Error(`Torneo con ID ${matchData.tournamentId} no encontrado.`);
      
      console.log('[DEBUG] All primary documents exist. Proceeding to transaction.');

      const winnerData = winnerDoc.data() as Player;
      const loserData = loserDoc.data() as Player;
      const tournamentData = tournamentDoc.data() as Tournament;

      // 2. EXECUTE MINIMAL TRANSACTION
      await db.runTransaction(async (transaction) => {
        console.log('[TRANSACTION_START] Starting minimal transaction for match:', matchId);

        transaction.update(matchRef, { 
            winnerId: winnerId, 
            status: "Completado", 
            score: isRetirement ? `${score} (Ret.)` : score
        });
        
        transaction.update(winnerRef, { globalWins: FieldValue.increment(1) });
        transaction.update(loserRef, { globalLosses: FieldValue.increment(1) });

        console.log('[TRANSACTION_END] Minimal transaction updates queued.');
      });
      console.log('[TRANSACTION_SUCCESS] Minimal transaction completed successfully.');

      // 3. POST-TRANSACTION OPERATIONS (non-atomic)
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
                    }).then(() => console.log('[POST_TRANSACTION] Ladder position update completed.'))
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

      await Promise.all(postTransactionPromises);
      
      console.log('[FLOW_SUCCESS] Flow completed successfully for match:', matchId);
      return { success: true, message: "Resultado guardado exitosamente." };

    } catch (error: any) {
      console.error("[FLOW_ERROR] Critical error in registerMatchResultFlow: ", error.message, error.stack);
      return { success: false, message: error.message || "No se pudo guardar el resultado debido a un error interno." };
    }
  }
);
