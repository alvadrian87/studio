
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import type { Player, Match, Tournament, Challenge } from '@/types';


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
    try {
        const db = getFirestore();
        const matchRef = db.collection("matches").doc(matchId);
        const matchDoc = await matchRef.get();

        if (!matchDoc.exists) {
            return { success: false, message: "La partida no fue encontrada." };
        }
        
        const matchData = matchDoc.data() as Match;
        if(matchData.status === 'Completado') {
            return { success: false, message: "Este resultado ya ha sido registrado." };
        }
        
        const loserId = matchData.player1Id === winnerId ? matchData.player2Id : matchData.player1Id;
        
        const winnerRef = db.collection("users").doc(winnerId);
        const loserRef = db.collection("users").doc(loserId);
        const tournamentRef = db.collection("tournaments").doc(matchData.tournamentId);

        const [winnerDoc, loserDoc, tournamentDoc] = await Promise.all([
            winnerRef.get(),
            loserRef.get(),
            tournamentRef.get()
        ]);

        if (!winnerDoc.exists || !loserDoc.exists || !tournamentDoc.exists) {
            return { success: false, message: "No se pudieron encontrar los datos del jugador o del torneo." };
        }

        const winnerData = winnerDoc.data() as Player;
        const loserData = loserDoc.data() as Player;
        const tournamentData = tournamentDoc.data() as Tournament;

        await db.runTransaction(async (transaction) => {
            // Write operations only inside the transaction
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
                // We just update the state. The complex ladder logic is now out of the transaction.
                // TODO: Implement efficient position swap using a Cloud Function triggered by this update.
                transaction.update(challengeRef, { estado: 'Jugado' });
            }
      });
      
      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("Error in registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
