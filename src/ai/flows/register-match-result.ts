
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin'; 
import { FieldValue } from 'firebase-admin/firestore';
import type { Player, Match, Tournament } from '@/types';


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
      await db.runTransaction(async (transaction) => {

        const matchRef = db.collection("matches").doc(matchId);
        const matchDoc = await transaction.get(matchRef);

        if (!matchDoc.exists) {
          throw new Error("La partida no fue encontrada.");
        }
        
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
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
        
        // --- ATOMIC WRITES ---
        const finalScore = isRetirement ? `${score} (Ret.)` : score;
        transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: finalScore });
        
        transaction.update(winnerRef, { globalWins: FieldValue.increment(1) });
        transaction.update(loserRef, { globalLosses: FieldValue.increment(1) });

        if (tournamentData.isRanked) {
            const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
            const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
            
            transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
            transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
        }
      });
      
      return { success: true, message: "Resultado guardado exitosamente." };

    } catch (error: any) {
      console.error("[REGISTER_RESULT_ERROR] Critical error in registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado debido a un error interno." };
    }
  }
);
