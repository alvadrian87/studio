
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
    if (!matchData.challengeId || !matchData.tournamentId) {
        console.warn(`Match ${matchData.id} has no challenge or tournament ID. Skipping ladder update.`);
        return;
    }

    const batch = db.batch();

    // 1. Update challenge status
    const challengeRef = db.collection("challenges").doc(matchData.challengeId);
    const challengeDoc = await challengeRef.get();
    if (!challengeDoc.exists) {
        console.warn(`Challenge ${matchData.challengeId} not found for match ${matchData.id}. Skipping ladder update.`);
        return; // The challenge might have been deleted, but we can still proceed without this update.
    }
    const challengeData = challengeDoc.data() as Challenge;
    batch.update(challengeRef, { estado: 'Jugado' });
    
    // 2. Position Swap Logic only if challenger wins
    if (winnerId === challengeData.retadorId) {
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
        
        // Perform the swap
        batch.update(retadorInscriptionDoc.ref, { posicionActual: desafiadoPosition });
        batch.update(desafiadoInscriptionDoc.ref, { posicionActual: retadorPosition });
    }

    await batch.commit();
}


export const registerMatchResult = ai.defineFlow(
  {
    name: 'registerMatchResultFlow',
    inputSchema: RegisterMatchResultInputSchema,
    outputSchema: RegisterMatchResultOutputSchema,
  },
  async ({ matchId, winnerId, score, isRetirement }) => {
    const db = getFirestore();
    // These variables will hold data needed for post-transaction logic.
    let matchDataForPostLogic: Match; 
    let tournamentDataForPostLogic: Tournament;
    let needsLadderUpdate = false;

    try {
        await db.runTransaction(async (transaction) => {
            const matchRef = db.collection("matches").doc(matchId);
            const matchDoc = await transaction.get(matchRef);

            if (!matchDoc.exists) {
                throw new Error("La partida no fue encontrada.");
            }
            const localMatchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
            matchDataForPostLogic = localMatchData; // Store for later use

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
                transaction.get(tournamentRef) // Tournament data is needed for isRanked and type checks
            ]);

            if (!winnerDoc.exists() || !loserDoc.exists() || !tournamentDoc.exists()) {
                throw new Error("No se pudieron encontrar los datos del jugador o del torneo.");
            }

            const winnerData = winnerDoc.data() as Player;
            const loserData = loserDoc.data() as Player;
            const tournamentData = tournamentDoc.data() as Tournament;
            tournamentDataForPostLogic = tournamentData; // Store for later use

            // --- ALL WRITES WITHIN THE TRANSACTION ---
            
            // 1. Update Match
            transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: score });
            
            // 2. Update player global stats
            const newWinnerWins = (winnerData.globalWins || 0) + 1;
            const newLoserLosses = (loserData.globalLosses || 0) + 1;
            transaction.update(winnerRef, { globalWins: newWinnerWins });
            transaction.update(loserRef, { globalLosses: newLoserLosses });

            // 3. Update ELO if it's a ranked tournament
            if (tournamentData.isRanked) {
                const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
                const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
                
                transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
                transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
            }

            // Decide if a ladder update is needed after the transaction completes
            if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && localMatchData.challengeId) {
                needsLadderUpdate = true;
            }
        });

      // --- Post-Transaction Logic (executes only if transaction was successful) ---
      if (needsLadderUpdate) {
         await updateLadderPositions(db, matchDataForPostLogic!, winnerId);
      }

      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("Error in registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
