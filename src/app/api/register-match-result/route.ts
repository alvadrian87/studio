
import { NextResponse } from "next/server";
import { authAdmin, db } from "@/lib/firebase-admin";
import type { Match, Player, Inscription, Tournament, Challenge } from "@/types";
import { updateLadderPositions } from "@/ai/flows/update-ladder-positions";
import admin from 'firebase-admin'; // Importar el admin SDK

// Constantes para el cálculo de ELO
const K_FACTOR_DEFAULT = 32;
const K_FACTOR_PRO = 16; // Para jugadores con más de 2400 ELO

// Función para calcular el nuevo ELO
function calculateNewElo(playerElo: number, opponentElo: number, score: 1 | 0 | 0.5) {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const kFactor = playerElo > 2400 ? K_FACTOR_PRO : K_FACTOR_DEFAULT;
    return playerElo + kFactor * (score - expectedScore);
}

export async function POST(request: Request) {
    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ message: "No se proporcionó token de autorización." }, { status: 401 });
        }

        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            return NextResponse.json({ message: "No tienes permisos para realizar esta acción." }, { status: 403 });
        }

        const { matchId, winnerId: winnerInscriptionId, score: scoreString, isRetirement } = await request.json();

        if (!matchId || !winnerInscriptionId) {
            return NextResponse.json({ message: "Faltan datos (matchId, winnerId)." }, { status: 400 });
        }
        
        console.log('[API] Received payload:', { matchId, winnerInscriptionId, scoreString, isRetirement });

        const batch = db.batch();
        const matchRef = db.collection('matches').doc(matchId);
        const matchDoc = await matchRef.get();

        if (!matchDoc.exists) {
            return NextResponse.json({ message: "La partida no existe." }, { status: 404 });
        }

        const match = { id: matchDoc.id, ...matchDoc.data() } as Match;
        if (match.status === 'Completado') {
             return NextResponse.json({ message: "Esta partida ya ha sido completada." }, { status: 400 });
        }

        const tournamentRef = db.collection('tournaments').doc(match.tournamentId);
        const tournamentDoc = await tournamentRef.get();
        const tournament = tournamentDoc.data() as Tournament;


        // 1. Actualizar el estado de la partida
        batch.update(matchRef, {
            winnerId: winnerInscriptionId,
            status: 'Completado',
            score: scoreString,
        });

        const winnerInscriptionRef = db.collection(`tournaments/${match.tournamentId}/inscriptions`).doc(winnerInscriptionId);
        const loserInscriptionId = match.player1Id === winnerInscriptionId ? match.player2Id : match.player1Id;
        const loserInscriptionRef = db.collection(`tournaments/${match.tournamentId}/inscriptions`).doc(loserInscriptionId);

        const [winnerInscriptionDoc, loserInscriptionDoc] = await Promise.all([
            winnerInscriptionRef.get(),
            loserInscriptionRef.get(),
        ]);

        if (!winnerInscriptionDoc.exists || !loserInscriptionDoc.exists) {
            throw new Error("No se encontraron las inscripciones del ganador o perdedor.");
        }
        
        const winnerInscription = winnerInscriptionDoc.data() as Inscription;
        const loserInscription = loserInscriptionDoc.data() as Inscription;


        // 2. Actualizar ELO, victorias y derrotas si el torneo es rankeado
        if (tournament.isRanked) {
             const winnerPlayerDocs = await db.collection('users').where('uid', 'in', winnerInscription.jugadoresIds).get();
             const loserPlayerDocs = await db.collection('users').where('uid', 'in', loserInscription.jugadoresIds).get();

             const winnerPlayers = winnerPlayerDocs.docs.map(doc => doc.data() as Player);
             const loserPlayers = loserPlayerDocs.docs.map(doc => doc.data() as Player);

             const winnerTeamElo = winnerPlayers.reduce((acc, p) => acc + p.rankPoints, 0) / winnerPlayers.length;
             const loserTeamElo = loserPlayers.reduce((acc, p) => acc + p.rankPoints, 0) / loserPlayers.length;

             const newWinnerTeamElo = calculateNewElo(winnerTeamElo, loserTeamElo, 1);
             const newLoserTeamElo = calculateNewElo(loserTeamElo, winnerTeamElo, 0);

             const eloGain = newWinnerTeamElo - winnerTeamElo;
             const eloLoss = newLoserTeamElo - loserTeamElo; // será negativo

            for (const player of winnerPlayers) {
                const playerRef = db.collection('users').doc(player.uid);
                batch.update(playerRef, {
                    globalWins: admin.firestore.FieldValue.increment(1),
                    rankPoints: admin.firestore.FieldValue.increment(eloGain)
                });
            }
             for (const player of loserPlayers) {
                const playerRef = db.collection('users').doc(player.uid);
                batch.update(playerRef, {
                    globalLosses: admin.firestore.FieldValue.increment(1),
                    rankPoints: admin.firestore.FieldValue.increment(eloLoss)
                });
            }
        }

        // 3. Si es una partida de desafío de escalera, actualizar posiciones
        if (match.challengeId && tournament.tipoTorneo === 'Evento tipo Escalera') {
            console.log('[API] Ladder match detected. Calling updateLadderPositions flow.');
            
            const challengeDoc = await db.collection('challenges').doc(match.challengeId).get();
            if (!challengeDoc.exists) throw new Error("El desafío asociado no existe.");
            
            const challenge = challengeDoc.data() as Challenge;

            // Solo intercambiar si el ganador fue el retador
            if (challenge.retadorId === winnerInscriptionId) {
                const flowResult = await updateLadderPositions({
                    tournamentId: match.tournamentId,
                    eventId: challenge.eventoId,
                    winnerId: winnerInscriptionId,
                    loserId: loserInscriptionId,
                });
                if (!flowResult.success) {
                  // Log the error from the flow but don't block the main process
                  console.error("Flow Error: ", flowResult.message)
                }
            }
        }
        
        await batch.commit();

        return NextResponse.json({ message: "Resultado guardado y estadísticas actualizadas." }, { status: 200 });

    } catch (error: any) {
        console.error("[API_ERROR] register-match-result:", error);
        return NextResponse.json({ message: error.message || "Error interno del servidor." }, { status: 500 });
    }
}
