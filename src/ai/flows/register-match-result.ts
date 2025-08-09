
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import type { Player, Match, Tournament, Inscription, Challenge } from '@/types';
import admin from 'firebase-admin';

// Safely initialize the Firebase Admin SDK.
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
    return;
  }

  const batch = db.batch();
  const challengeRef = db.collection("challenges").doc(matchData.challengeId);
  const challengeDoc = await challengeRef.get();
  
  if (!challengeDoc.exists) {
    console.warn(`[LADDER_UPDATE] Challenge ${matchData.challengeId} not found for match ${matchData.id}. Skipping update.`);
    return;
  }
  
  const challengeData = challengeDoc.data() as Challenge;
  batch.update(challengeRef, { estado: 'Jugado' });

  if (winnerId === challengeData.retadorId) {
    const inscriptionsRef = db.collection(`tournaments/${matchData.tournamentId}/inscriptions`);
    const retadorInscriptionQuery = inscriptionsRef.where('jugadorId', '==', challengeData.retadorId).where('eventoId', '==', challengeData.eventoId).limit(1);
    const desafiadoInscriptionQuery = inscriptionsRef.where('jugadorId', '==', challengeData.desafiadoId).where('eventoId', '==', challengeData.eventoId).limit(1);

    const [retadorSnapshot, desafiadoSnapshot] = await Promise.all([
        retadorInscriptionQuery.get(),
        desafiadoInscriptionQuery.get()
    ]);
    
    if (retadorSnapshot.empty || desafiadoSnapshot.empty) {
        console.error("[LADDER_UPDATE] Could not find inscriptions for one or both players.");
        throw new Error("Could not find player inscriptions for position swap.");
    }

    const retadorInscriptionDoc = retadorSnapshot.docs[0];
    const desafiadoInscriptionDoc = desafiadoSnapshot.docs[0];
    const retadorPosition = retadorInscriptionDoc.data().posicionActual;
    const desafiadoPosition = desafiadoInscriptionDoc.data().posicionActual;
    
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
    
    try {
      let matchForPostLogic: Match | null = null;
      let tournamentForPostLogic: Tournament | null = null;
      let needsLadderUpdate = false;

      await db.runTransaction(async (transaction) => {
        const matchRef = db.collection("matches").doc(matchId);
        const matchDoc = await transaction.get(matchRef);

        if (!matchDoc.exists) throw new Error("La partida no fue encontrada.");
        
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        matchForPostLogic = matchData;

        if (matchData.status === 'Completado') throw new Error("Este resultado ya ha sido registrado.");

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
        tournamentForPostLogic = tournamentData;
        
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
            needsLadderUpdate = true;
        }
      });

      if (needsLadderUpdate && matchForPostLogic) {
        await updateLadderPositions(db, matchForPostLogic, winnerId);
      }

      return { success: true, message: "Resultado guardado exitosamente." };
    } catch (error: any) {
      console.error("[REGISTER_RESULT] Error in registerMatchResultFlow: ", error);
      return { success: false, message: error.message || "No se pudo guardar el resultado." };
    }
  }
);
