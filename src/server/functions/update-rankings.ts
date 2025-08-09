
/**
 * @file This file contains the logic for a scheduled Cloud Function that processes match results
 * to update player ELO rankings. It's designed to be run periodically (e.g., once a day)
 * by a service like Google Cloud Scheduler.
 */

// Import necessary Firebase Admin SDK modules.
// This code is intended for a Node.js server environment (like Cloud Functions),
// not for the client-side application.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK if it hasn't been already.
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Calculates the new ELO rating for a player based on the match outcome.
 * @param {number} playerRating - The current ELO rating of the player.
 * @param {number} opponentRating - The current ELO rating of the opponent.
 * @param {number} result - The result of the match for the player (1 for a win, 0 for a loss).
 * @returns {number} The new ELO rating for the player.
 */
const calculateElo = (playerRating: number, opponentRating: number, result: number): number => {
    const kFactor = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    return playerRating + kFactor * (result - expectedScore);
};

/**
 * A scheduled Cloud Function that processes unprocessed match results to update player rankings.
 * This function should be triggered by a scheduler (e.g., Google Cloud Scheduler).
 */
export const updateRankings = functions.https.onRequest(async (req, res) => {
    
    // Simple secret key authentication to prevent unauthorized execution.
    // The key should be sent in a header or as a query parameter in the scheduler's request.
    const SECRET_KEY = process.env.FUNCTION_SECRET_KEY; // Set this in your function's environment variables
    const requestKey = req.query.key || req.headers['x-function-secret'];
    
    if (requestKey !== SECRET_KEY) {
        console.warn("Unauthorized attempt to run updateRankings function.");
        res.status(401).send("Unauthorized");
        return;
    }

    try {
        console.log("Starting scheduled ranking update...");

        // 1. Fetch all ranked tournaments to know which matches to process.
        const rankedTournamentsSnapshot = await db.collection("tournaments")
            .where("isRanked", "==", true)
            .get();

        if (rankedTournamentsSnapshot.empty) {
            console.log("No ranked tournaments found. Exiting function.");
            res.status(200).send("No ranked tournaments to process.");
            return;
        }

        const rankedTournamentIds = rankedTournamentsSnapshot.docs.map(doc => doc.id);

        // 2. Fetch all completed matches from these tournaments that haven't been processed yet.
        const matchesToProcessSnapshot = await db.collection("matches")
            .where("tournamentId", "in", rankedTournamentIds)
            .where("status", "==", "Completado")
            .where("rankingsProcessed", "==", false)
            .get();

        if (matchesToProcessSnapshot.empty) {
            console.log("No new match results to process for ranking updates.");
            res.status(200).send("No new matches to process.");
            return;
        }
        
        const matchesToProcess = matchesToProcessSnapshot.docs;
        console.log(`Found ${matchesToProcess.length} matches to process.`);

        const batch = db.batch();
        const playerRatingUpdates: { [playerId: string]: { newRating: number, matches: number } } = {};

        // 3. Iterate through each match to calculate ELO changes.
        for (const matchDoc of matchesToProcess) {
            const matchData = matchDoc.data();
            const { winnerId, player1Id, player2Id } = matchData;

            if (!winnerId) continue; // Skip if there's no winner

            const loserId = winnerId === player1Id ? player2Id : player1Id;

            // Fetch player data
            const winnerDoc = await db.collection("users").doc(winnerId).get();
            const loserDoc = await db.collection("users").doc(loserId).get();

            if (!winnerDoc.exists || !loserDoc.exists) {
                console.warn(`Skipping match ${matchDoc.id}: could not find one or more players.`);
                continue; // Skip this match if player data is missing
            }

            const winnerData = winnerDoc.data()!;
            const loserData = loserDoc.data()!;

            // Calculate new ELO ratings
            const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
            const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);

            // Aggregate updates to handle cases where a player has multiple matches in one run.
            // For simplicity, we'll just use the latest calculated rating. A more complex system
            // might average the changes, but sequential processing is generally better.
            // This example assumes we process matches one-by-one and update ratings in memory.
            const currentWinnerRating = playerRatingUpdates[winnerId]?.newRating || winnerData.rankPoints;
            const currentLoserRating = playerRatingUpdates[loserId]?.newRating || loserData.rankPoints;
            
            playerRatingUpdates[winnerId] = { newRating: calculateElo(currentWinnerRating, currentLoserRating, 1), matches: (playerRatingUpdates[winnerId]?.matches || 0) + 1 };
            playerRatingUpdates[loserId] = { newRating: calculateElo(currentLoserRating, currentWinnerRating, 0), matches: (playerRatingUpdates[loserId]?.matches || 0) + 1 };

            // Mark the match as processed in the batch
            batch.update(matchDoc.ref, { rankingsProcessed: true });
        }

        // 4. Apply all player rating updates to the batch.
        for (const playerId in playerRatingUpdates) {
            const userRef = db.collection("users").doc(playerId);
            const newRating = Math.round(playerRatingUpdates[playerId].newRating);
            batch.update(userRef, { rankPoints: newRating });
        }
        
        // 5. Commit all updates in a single batch.
        await batch.commit();

        console.log(`Successfully updated rankings for ${Object.keys(playerRatingUpdates).length} players from ${matchesToProcess.length} matches.`);
        res.status(200).send("Ranking update completed successfully.");

    } catch (error) {
        console.error("Error during scheduled ranking update:", error);
        res.status(500).send("An error occurred during the ranking update process.");
    }
});
