
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Check, Clock, Swords, Trophy, X, ShieldQuestion, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth";
import type { Player, Match, Challenge, Tournament, Inscription } from "@/hooks/use-firestore";
import { useCollection, useDocument } from "@/hooks/use-firestore";
import { doc, updateDoc, addDoc, collection, writeBatch, runTransaction, getDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";


export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: player, loading: loadingPlayer } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  const { data: allMatches, loading: loadingMatches } = useCollection<Match>('matches');
  const { data: allChallenges, loading: loadingChallenges } = useCollection<Challenge>('challenges');
  const { data: allPlayers, loading: loadingPlayers } = useCollection<Player>('users');
  const { data: allTournaments, loading: loadingTournaments } = useCollection<Tournament>('tournaments');
  
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [scores, setScores] = useState([
    { p1: '', p2: '' }, // Set 1
    { p1: '', p2: '' }, // Set 2
    { p1: '', p2: '' }, // Set 3
  ]);
  const [isWinnerRadioDisabled, setIsWinnerRadioDisabled] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreInputErrors, setScoreInputErrors] = useState<boolean[][]>([
    [false, false],
    [false, false],
    [false, false],
  ]);

  const getPlayerById = useCallback((id: string | undefined) => {
    return allPlayers?.find(p => p.uid === id);
  }, [allPlayers]);

  const getPlayersForMatch = useCallback((match: Match | null) => {
    if (!match || !allPlayers) return { player1: null, player2: null };
    const player1 = getPlayerById(match.player1Id);
    const player2 = getPlayerById(match.player2Id);
    return { player1, player2 };
  }, [allPlayers, getPlayerById]);

  // Call all hooks unconditionally at the top level
  useEffect(() => {
    if (!isResultDialogOpen) return;

    const { player1: p1, player2: p2 } = getPlayersForMatch(selectedMatch);
    if (!p1 || !p2) return;
    
    const tournamentId = selectedMatch?.tournamentId;
    const tournament = allTournaments?.find(t => t.id === tournamentId);
    const isSuperTiebreakFormat = tournament?.formatoScore === '2 Sets + Super Tiebreak';

    let p1SetsWon = 0;
    let p2SetsWon = 0;
    let localError: string | null = null;
    const newScoreInputErrors: boolean[][] = [ [false, false], [false, false], [false, false] ];

    const validateSet = (score1: number, score2: number, setIndex: number, isSuperTiebreak: boolean = false) => {
        if (isNaN(score1) || isNaN(score2)) return null;

        const winningScore = isSuperTiebreak ? 10 : 6;
        const tiebreakWinningScore = 7;

        const hasError = (msg: string) => {
            localError = msg;
            newScoreInputErrors[setIndex][0] = true;
            newScoreInputErrors[setIndex][1] = true;
        };
        
        // Rule: No score in a regular set can be higher than 7
        if (!isSuperTiebreak && (score1 > tiebreakWinningScore || score2 > tiebreakWinningScore)) {
            hasError(`Un set no puede tener más de 7 juegos.`);
            return null;
        }

        // Rule: If a score is 7, the other must be 5 or 6
        if (!isSuperTiebreak && ((score1 === tiebreakWinningScore && (score2 < 5 || score2 > 6)) || (score2 === tiebreakWinningScore && (score1 < 5 || score1 > 6)))) {
             hasError(`Un marcador de 7 juegos solo es posible con 7-5 o 7-6.`);
             return null;
        }

        // Rule: Win by 2 (general case)
        if ((score1 >= winningScore || score2 >= winningScore) && Math.abs(score1 - score2) < 2) {
            // Exception for tiebreak score like 7-6
            if (!isSuperTiebreak && !((score1 === tiebreakWinningScore && score2 === 6) || (score2 === tiebreakWinningScore && score1 === 6))) {
                 hasError(`Un set debe ganarse por 2 juegos de diferencia (o ganar un tie-break 7-6).`);
                 return null;
            }
        }
        
        // Rule: Cannot be 6-5
        if (!isSuperTiebreak && ((score1 === 6 && score2 === 5) || (score2 === 6 && score1 === 5))) {
             hasError(`Un set no puede terminar 6-5. El siguiente marcador posible es 7-5 o 6-6.`);
             return null;
        }

        // Determine winner
        if (isSuperTiebreak) {
            if (score1 >= winningScore && score1 >= score2 + 2) return 'p1';
            if (score2 >= winningScore && score2 >= score1 + 2) return 'p2';
        } else {
             if (score1 === tiebreakWinningScore && (score2 === 6 || score2 === 5)) return 'p1'; // 7-6, 7-5
             if (score2 === tiebreakWinningScore && (score1 === 6 || score1 === 5)) return 'p2'; // 7-6, 7-5
             if (score1 === winningScore && score2 < 5) return 'p1'; // 6-0 to 6-4
             if (score2 === winningScore && score1 < 5) return 'p2'; // 6-0 to 6-4
        }
        
        return null; // No winner determined yet / score incomplete
    }

    // Validate first two sets
    for (let i = 0; i < 2; i++) {
        const set = scores[i];
        if (localError) continue; // Stop validation if an error was already found
        const score1 = parseInt(set.p1, 10);
        const score2 = parseInt(set.p2, 10);
        const setWinner = validateSet(score1, score2, i);
        if (setWinner === 'p1') p1SetsWon++;
        else if (setWinner === 'p2') p2SetsWon++;
    }
    
    // Validate third set (super tiebreak) if necessary
    if (!localError && isSuperTiebreakFormat && p1SetsWon === 1 && p2SetsWon === 1) {
        const tiebreak = scores[2];
        const score1 = parseInt(tiebreak.p1, 10);
        const score2 = parseInt(tiebreak.p2, 10);

        if (!isNaN(score1) || !isNaN(score2)) { // Only validate if there is input
             const setWinner = validateSet(score1, score2, 2, true);
             if (setWinner === 'p1') {
                p1SetsWon++;
             } else if (setWinner === 'p2') {
                p2SetsWon++;
             }
        }
    }
    
    setScoreError(localError);
    setScoreInputErrors(newScoreInputErrors);

    // Auto-select winner if validation passes and match is complete
    if (!localError && (p1SetsWon === 2 || p2SetsWon === 2)) {
        if (p1SetsWon === 2) {
            setWinnerId(p1.uid);
            setIsWinnerRadioDisabled(true);
        } else if (p2SetsWon === 2) {
            setWinnerId(p2.uid);
            setIsWinnerRadioDisabled(true);
        }
    } else {
        // If match is not complete or score is invalid, allow manual selection
        setWinnerId(null);
        setIsWinnerRadioDisabled(false);
    }

}, [scores, selectedMatch, allPlayers, allTournaments, isResultDialogOpen, getPlayersForMatch]);


  const pendingChallenges = useMemo(() => {
    if (!allChallenges || !user) return [];
    return allChallenges.filter(c => c.desafiadoId === user.uid && c.estado === 'Pendiente');
  }, [allChallenges, user]);

  const userMatches = useMemo(() => {
    if (!allMatches || !user) return [];
    return allMatches.filter(m => m.player1Id === user.uid || m.player2Id === user.uid)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMatches, user]);
  
  const playerRank = useMemo(() => {
    if (!allPlayers || !player) return 0;
    const sortedPlayers = [...allPlayers].sort((a, b) => b.rankPoints - a.rankPoints);
    return sortedPlayers.findIndex(p => p.uid === player.uid) + 1;
  }, [allPlayers, player]);

  const getOpponent = (match: Match) => {
    if (!user || !allPlayers) return null;
    const opponentId = match.player1Id === user.uid ? match.player2Id : match.player1Id;
    return allPlayers.find(p => p.uid === opponentId);
  }
  
  const handleChallengeResponse = async (challengeId: string, accepted: boolean) => {
    const challengeRef = doc(db, "challenges", challengeId);
    try {
      if (accepted) {
        const challenge = allChallenges?.find(c => c.id === challengeId);
        if (!challenge) throw new Error("Desafío no encontrado");

        const batch = writeBatch(db);

        // Create the match
        const matchRef = doc(collection(db, "matches"));
        batch.set(matchRef, {
          player1Id: challenge.retadorId,
          player2Id: challenge.desafiadoId,
          winnerId: null,
          status: 'Pendiente',
          date: format(new Date(), "yyyy-MM-dd HH:mm"),
          tournamentId: challenge.torneoId,
          score: null,
          challengeId: challenge.id,
        });

        // Update the challenge
        batch.update(challengeRef, { estado: "Aceptado" });

        await batch.commit();

        toast({ title: "¡Desafío Aceptado!", description: "La partida ha sido creada." });
      } else {
        await updateDoc(challengeRef, { estado: "Rechazado" });
        toast({ title: "Desafío Rechazado", variant: "default" });
      }
    } catch (error) {
      console.error("Error al responder al desafío:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar tu respuesta." });
    }
  };

  const handleOpenResultDialog = (match: Match) => {
    setSelectedMatch(match);
    setWinnerId(null);
    setScores([ { p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' } ]);
    setScoreError(null);
    setScoreInputErrors([ [false, false], [false, false], [false, false] ]);
    setIsResultDialogOpen(true);
  }
  
  const calculateElo = (playerRating: number, opponentRating: number, result: number) => {
      const kFactor = 32;
      const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
      return playerRating + kFactor * (result - expectedScore);
  };
  
  const formatScoreString = () => {
    return scores
      .map(set => `${set.p1}-${set.p2}`)
      .filter(set => set !== '-' && set !== '0-0' && set !== '' && set.p1 !== '' && set.p2 !== '')
      .join(', ');
  };

  const handleScoreChange = (setIndex: number, playerKey: 'p1' | 'p2', value: string) => {
    const newScores = [...scores];
    newScores[setIndex][playerKey] = value.replace(/[^0-9]/g, '');
    setScores(newScores);
  };

  const handleConfirmAndSave = async () => {
    setIsConfirmDialogOpen(false); // Close confirmation dialog
    await handleSaveResult(); // Proceed with saving
  };
  
    
  const handleSaveResult = async () => {
    if (!selectedMatch || !winnerId) {
        toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un ganador." });
        return;
    }

    const { player1: p1, player2: p2 } = getPlayersForMatch(selectedMatch);
    if (!p1 || !p2) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los jugadores." });
      return;
    }
    
    if (scoreError) {
        toast({ variant: "destructive", title: "Marcador Inválido", description: scoreError });
        return;
    }

    // Final validation before submitting
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    const tournament = allTournaments?.find(t => t.id === selectedMatch.tournamentId);
    const isSuperTiebreakFormat = tournament?.formatoScore === '2 Sets + Super Tiebreak';

    for (let i = 0; i < 2; i++) {
        const set = scores[i];
        const score1 = parseInt(set.p1, 10);
        const score2 = parseInt(set.p2, 10);

        if (isNaN(score1) || isNaN(score2)) continue;
        if ((score1 >= 6 && score1 >= score2 + 2) || (score1 === 7 && (score2 === 5 || score2 === 6))) p1SetsWon++;
        else if ((score2 >= 6 && score2 >= score1 + 2) || (score2 === 7 && (score1 === 5 || score1 === 6))) p2SetsWon++;
    }
    
    if (isSuperTiebreakFormat && p1SetsWon === 1 && p2SetsWon === 1) {
        const tiebreak = scores[2];
        const score1 = parseInt(tiebreak.p1, 10);
        const score2 = parseInt(tiebreak.p2, 10);
        if (!isNaN(score1) && !isNaN(score2)) {
            if (score1 >= 10 && score1 >= score2 + 2) p1SetsWon++;
            else if (score2 >= 10 && score2 >= score1 + 2) p2SetsWon++;
        }
    }
    
    const calculatedWinnerId = p1SetsWon > p2SetsWon ? p1.uid : (p2SetsWon > p1SetsWon ? p2.uid : null);
    if (calculatedWinnerId !== winnerId) {
        toast({
            variant: "destructive",
            title: "Error de Validación",
            description: "El marcador no coincide con el ganador seleccionado o está incompleto. Por favor, revisa los datos.",
        });
        return;
    }
    
    setIsSubmittingResult(true);
    const finalScore = formatScoreString();

    try {
        const loserId = selectedMatch.player1Id === winnerId ? selectedMatch.player2Id : selectedMatch.player1Id;
        
      await runTransaction(db, async (transaction) => {
        if (!selectedMatch?.tournamentId) throw new Error("ID de torneo no encontrado en la partida.");
        
        const matchRef = doc(db, "matches", selectedMatch.id);
        const winnerRef = doc(db, "users", winnerId);
        const loserRef = doc(db, "users", loserId);
        const tournamentRef = doc(db, "tournaments", selectedMatch.tournamentId);

        const [winnerDoc, loserDoc, tournamentDoc] = await Promise.all([
          transaction.get(winnerRef),
          transaction.get(loserRef),
          transaction.get(tournamentRef)
        ]);
        

        if (!winnerDoc.exists() || !loserDoc.exists() || !tournamentDoc.exists()) throw new Error("No se encontraron los datos de los jugadores o del torneo.");
        
        const winnerData = winnerDoc.data() as Player;
        const loserData = loserDoc.data() as Player;
        const tournamentData = tournamentDoc.data() as Tournament;
        
        if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && selectedMatch.challengeId) {
            const challengeRef = doc(db, "challenges", selectedMatch.challengeId);
            const challengeDoc = await transaction.get(challengeRef);
            if (!challengeDoc.exists()) throw new Error("Desafío no encontrado para la lógica de escalera");
            const challengeData = challengeDoc.data() as Challenge;

            if (challengeData.eventoId) {
                const inscriptionsRef = collection(db, "inscriptions");
                const winnerInscriptionQuery = query(inscriptionsRef, where("jugadorId", "==", winnerId), where("eventoId", "==", challengeData.eventoId));
                const loserInscriptionQuery = query(inscriptionsRef, where("jugadorId", "==", loserId), where("eventoId", "==", challengeData.eventoId));

                const winnerInscriptionsSnap = await getDocs(winnerInscriptionQuery);
                const loserInscriptionsSnap = await getDocs(loserInscriptionQuery);

                if (!winnerInscriptionsSnap.empty && !loserInscriptionsSnap.empty) {
                    const winnerInscriptionRef = winnerInscriptionsSnap.docs[0].ref;
                    const loserInscriptionRef = loserInscriptionsSnap.docs[0].ref;

                    const winnerInscriptionDoc = await transaction.get(winnerInscriptionRef);
                    const loserInscriptionDoc = await transaction.get(loserInscriptionRef);
                    
                    if (winnerInscriptionDoc.exists() && loserInscriptionDoc.exists()) {
                        const winnerInscriptionData = winnerInscriptionDoc.data() as Inscription;
                        const loserInscriptionData = loserInscriptionDoc.data() as Inscription;

                        const challengerIsWinner = winnerId === challengeData.retadorId;
                        
                        // Challenger must be ranked lower to swap positions
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
        
        const newWinnerWins = (winnerData.globalWins || 0) + 1;
        const newLoserLosses = (loserData.globalLosses || 0) + 1;
        
        transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: finalScore });
        transaction.update(winnerRef, { globalWins: newWinnerWins });
        transaction.update(loserRef, { globalLosses: newLoserLosses });

        if (tournamentData.isRanked) {
          const winnerNewRating = calculateElo(winnerData.rankPoints, loserData.rankPoints, 1);
          const loserNewRating = calculateElo(loserData.rankPoints, winnerData.rankPoints, 0);
          
          transaction.update(winnerRef, { rankPoints: Math.round(winnerNewRating) });
          transaction.update(loserRef, { rankPoints: Math.round(loserNewRating) });
        }
      });

      toast({ title: "¡Resultado Guardado!", description: "La partida y las estadísticas han sido actualizadas." });
      setIsResultDialogOpen(false);
      setSelectedMatch(null);

    } catch (error) {
      console.error("Error al guardar el resultado: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el resultado." });
    } finally {
        setIsSubmittingResult(false);
    }
  };

  const loading = loadingPlayer || loadingMatches || loadingChallenges || loadingPlayers || loadingTournaments;

  if (loading) {
    return <div>Cargando...</div>
  }
  
  if (!player) {
    return <div>No se encontraron datos del jugador.</div>
  }

  const totalGames = (player.globalWins || 0) + (player.globalLosses || 0);
  const { player1: playerInSelectedMatch, player2: opponentInSelectedMatch } = getPlayersForMatch(selectedMatch);


  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido de nuevo, {player.firstName || 'Jugador'}!</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clasificación Global</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{playerRank > 0 ? playerRank : '-'}</div>
            <p className="text-xs text-muted-foreground">{player.rankPoints} Puntos ELO</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Victorias</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{player.globalWins || 0}</div>
            <p className="text-xs text-muted-foreground">Totales en todos los torneos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Derrotas</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{player.globalLosses || 0}</div>
            <p className="text-xs text-muted-foreground">Tu historial de rendimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Victorias</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalGames > 0 ? (((player.globalWins || 0) / totalGames) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Rendimiento general</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Partidas Recientes</CardTitle>
            <CardDescription>Un resumen de tus últimas partidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oponente</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userMatches.length > 0 ? userMatches.map(match => {
                  const opponent = getOpponent(match);
                  return (
                    <TableRow key={match.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar>
                              <AvatarImage src={opponent?.avatar} alt={opponent?.displayName} />
                              <AvatarFallback>{opponent?.firstName?.substring(0,1)}{opponent?.lastName?.substring(0,1)}</AvatarFallback>
                           </Avatar>
                           <span className="font-medium">{opponent?.displayName || 'Desconocido'}</span>
                        </div>
                      </TableCell>
                       <TableCell className="hidden md:table-cell">
                        <Badge variant={match.status === 'Completado' ? 'secondary' : 'default'}>{match.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{format(new Date(match.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                         {match.status === 'Completado' ? (
                            <div className="flex flex-col items-end">
                                <span className={`font-bold ${match.winnerId === user?.uid ? 'text-primary' : 'text-destructive'}`}>
                                {match.winnerId === user?.uid ? 'Victoria' : 'Derrota'}
                                </span>
                                {match.score && <span className="text-xs text-muted-foreground">{match.score}</span>}
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleOpenResultDialog(match)}>Registrar</Button>
                          )}
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay partidas recientes.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Desafíos Activos</CardTitle>
            <CardDescription>Desafíos que esperan tu acción.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingChallenges.length > 0 ? (
              <ul className="space-y-4">
                {pendingChallenges.map(challenge => (
                  <li key={challenge.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{allPlayers?.find(p => p.uid === challenge.retadorId)?.displayName}</p>
                      <p className="text-sm text-muted-foreground">Te ha desafiado en: <span className="font-semibold text-primary">{challenge.tournamentName}</span></p>
                    </div>
                    <div className="flex gap-2">
                       <Button size="sm" variant="outline" onClick={() => handleChallengeResponse(challenge.id, false)}>Rechazar</Button>
                       <Button size="sm" onClick={() => handleChallengeResponse(challenge.id, true)}>Aceptar</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <ShieldQuestion className="h-10 w-10 mb-2" />
                <p>No tienes desafíos pendientes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

       <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Resultado de la Partida</DialogTitle>
            <DialogDescription>
              Introduce el marcador para determinar el ganador.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <RadioGroup onValueChange={setWinnerId} value={winnerId || ""} className="grid grid-cols-2 gap-4" disabled={isWinnerRadioDisabled}>
                {selectedMatch && playerInSelectedMatch && (
                    <div>
                        <RadioGroupItem value={playerInSelectedMatch.uid} id={`r1-${selectedMatch.id}`} className="sr-only" disabled={isWinnerRadioDisabled}/>
                        <Label 
                            htmlFor={`r1-${selectedMatch.id}`}
                            className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground ${winnerId === playerInSelectedMatch.uid ? 'border-primary' : ''} ${isWinnerRadioDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                            <Avatar className="mb-2">
                                <AvatarImage src={playerInSelectedMatch.avatar} />
                                <AvatarFallback>{playerInSelectedMatch.firstName?.substring(0,1)}{playerInSelectedMatch.lastName?.substring(0,1)}</AvatarFallback>
                            </Avatar>
                            {playerInSelectedMatch.displayName}
                        </Label>
                    </div>
                )}
                {selectedMatch && opponentInSelectedMatch && (
                     <div>
                        <RadioGroupItem value={opponentInSelectedMatch.uid} id={`r2-${selectedMatch.id}`} className="sr-only" disabled={isWinnerRadioDisabled}/>
                        <Label 
                            htmlFor={`r2-${selectedMatch.id}`}
                            className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground ${winnerId === opponentInSelectedMatch.uid ? 'border-primary' : ''} ${isWinnerRadioDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                             <Avatar className="mb-2">
                                <AvatarImage src={opponentInSelectedMatch.avatar} />
                                <AvatarFallback>{opponentInSelectedMatch.firstName?.substring(0,1)}{opponentInSelectedMatch.lastName?.substring(0,1)}</AvatarFallback>
                            </Avatar>
                            {opponentInSelectedMatch.displayName}
                        </Label>
                    </div>
                )}
            </RadioGroup>

            <div className="space-y-2">
                <Label>Marcador</Label>
                <div className="flex justify-around items-center">
                    <div className="w-1/3 text-center font-bold">Jugador</div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                         <div className="text-center text-sm font-medium text-muted-foreground">SET 1</div>
                         <div className="text-center text-sm font-medium text-muted-foreground">SET 2</div>
                         <div className="text-center text-sm font-medium text-muted-foreground">SET 3</div>
                    </div>
                </div>
                 <div className="flex justify-around items-center gap-2">
                    <div className="w-1/3 text-sm truncate">{playerInSelectedMatch?.displayName}</div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                         <Input className={cn("text-center", scoreInputErrors[0][0] && 'border-destructive')} value={scores[0].p1} onChange={(e) => handleScoreChange(0, 'p1', e.target.value)} />
                         <Input className={cn("text-center", scoreInputErrors[1][0] && 'border-destructive')} value={scores[1].p1} onChange={(e) => handleScoreChange(1, 'p1', e.target.value)} />
                         <Input className={cn("text-center", scoreInputErrors[2][0] && 'border-destructive')} value={scores[2].p1} onChange={(e) => handleScoreChange(2, 'p1', e.target.value)} />
                    </div>
                </div>
                 <div className="flex justify-around items-center gap-2">
                    <div className="w-1/3 text-sm truncate">{opponentInSelectedMatch?.displayName}</div>
                     <div className="flex-1 grid grid-cols-3 gap-2">
                         <Input className={cn("text-center", scoreInputErrors[0][1] && 'border-destructive')} value={scores[0].p2} onChange={(e) => handleScoreChange(0, 'p2', e.target.value)} />
                         <Input className={cn("text-center", scoreInputErrors[1][1] && 'border-destructive')} value={scores[1].p2} onChange={(e) => handleScoreChange(1, 'p2', e.target.value)} />
                         <Input className={cn("text-center", scoreInputErrors[2][1] && 'border-destructive')} value={scores[2].p2} onChange={(e) => handleScoreChange(2, 'p2', e.target.value)} />
                    </div>
                </div>
                {scoreError && (
                    <p className="text-sm font-medium text-destructive text-center pt-2">{scoreError}</p>
                )}
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancelar</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button disabled={isSubmittingResult || !winnerId || !!scoreError}>
                        Guardar Resultado
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Resultado</AlertDialogTitle>
                    <AlertDialogDescription>
                        ¿Estás seguro de que quieres registrar este resultado? Esta acción no se puede deshacer.
                        <div className="py-4 font-medium text-foreground">
                            <p>Ganador: {getPlayerById(winnerId)?.displayName}</p>
                            <p>Marcador: {formatScoreString()}</p>
                        </div>
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAndSave} disabled={isSubmittingResult}>
                        {isSubmittingResult && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar y Guardar
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

    
