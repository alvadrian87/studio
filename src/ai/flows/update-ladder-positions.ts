
'use server';

// IMPORTANT: force Node.js runtime (Admin SDK no funciona en Edge)
// export const runtime = 'nodejs'; // This export is not allowed in a 'use server' file.

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase-admin';
import type { Inscription } from '@/types';

console.log('[FLOW_LOAD] update-ladder-positions.ts loaded.');

const UpdateLadderPositionsInputSchema = z.object({
  tournamentId: z.string(),
  eventId: z.string(),
  winnerId: z.string().describe("The inscription ID of the challenger who won."),
  loserId: z.string().describe("The inscription ID of the challenged player who lost."),
});
export type UpdateLadderPositionsInput = z.infer<typeof UpdateLadderPositionsInputSchema>;

const UpdateLadderPositionsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type UpdateLadderPositionsOutput = z.infer<typeof UpdateLadderPositionsOutputSchema>;


export const updateLadderPositions = ai.defineFlow(
  {
    name: 'updateLadderPositionsFlow',
    inputSchema: UpdateLadderPositionsInputSchema,
    outputSchema: UpdateLadderPositionsOutputSchema,
  },
  async ({ tournamentId, eventId, winnerId, loserId }) => {
    console.log('[LADDER_UPDATE_START] Starting position swap for event:', eventId);

    try {
      const inscriptionsRef = db.collection(`tournaments/${tournamentId}/inscriptions`);
      
      const winnerInscriptionDocRef = inscriptionsRef.doc(winnerId);
      const loserInscriptionDocRef = inscriptionsRef.doc(loserId);
      
      const [winnerInscriptionDoc, loserInscriptionDoc] = await Promise.all([
        winnerInscriptionDocRef.get(),
        loserInscriptionDocRef.get()
      ]);

      if (!winnerInscriptionDoc.exists) {
        throw new Error(`No se encontró la inscripción para el ganador ${winnerId} en el evento ${eventId}.`);
      }
      if (!loserInscriptionDoc.exists) {
        throw new Error(`No se encontró la inscripción para el perdedor ${loserId} en el evento ${eventId}.`);
      }

      const winnerInscriptionData = winnerInscriptionDoc.data() as Inscription;
      const loserInscriptionData = loserInscriptionDoc.data() as Inscription;
      
      const winnerPosition = winnerInscriptionData.posicionActual;
      const loserPosition = loserInscriptionData.posicionActual;

      console.log(`[LADDER_UPDATE_INFO] Swapping positions: Winner ${winnerId} (Pos ${winnerPosition}) <-> Loser ${loserId} (Pos ${loserPosition})`);

      // Execute the swap in a batch write
      const batch = db.batch();
      batch.update(winnerInscriptionDoc.ref, { posicionActual: loserPosition });
      batch.update(loserInscriptionDoc.ref, { posicionActual: winnerPosition });
      
      await batch.commit();

      console.log('[LADDER_UPDATE_SUCCESS] Positions swapped successfully.');
      return { success: true, message: "Las posiciones en la escalera se han actualizado." };

    } catch (error: any) {
      console.error("[LADDER_UPDATE_ERROR] Failed to update ladder positions:", error.message, error.stack);
      return { success: false, message: error.message || "No se pudieron actualizar las posiciones." };
    }
  }
);

