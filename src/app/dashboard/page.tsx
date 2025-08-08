
"use client";

import { useMemo, useState } from "react";
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


export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: player, loading: loadingPlayer } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  const { data: allMatches, loading: loadingMatches } = useCollection<Match>('matches');
  const { data: allChallenges, loading: loadingChallenges } = useCollection<Challenge>('challenges');
  const { data: allPlayers, loading: loadingPlayers } = useCollection<Player>('users');
  const { data: allTournaments, loading: loadingTournaments } = useCollection<Tournament>('tournaments');
  
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [scores, setScores] = useState([
    { p1: '', p2: '' }, // Set 1
    { p1: '', p2: '' }, // Set 2
    { p1: '', p2: '' }, // Set 3
  ]);


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
      .filter(set => set !== '-') // Filter out empty sets
      .join(', ');
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

    // Score validation logic
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    let validSets = 0;

    for (const set of scores) {
        const score1 = parseInt(set.p1, 10);
        const score2 = parseInt(set.p2, 10);

        if (!isNaN(score1) && !isNaN(score2)) {
            validSets++;
            if (score1 > score2) p1SetsWon++;
            else if (score2 > score1) p2SetsWon++;
        }
    }
    
    if (validSets < 2) {
        toast({ variant: "destructive", title: "Marcador Incompleto", description: "Debes registrar al menos dos sets." });
        return;
    }

    const calculatedWinnerId = p1SetsWon > p2SetsWon ? p1.uid : p2.uid;
    if (p1SetsWon !== p2SetsWon && calculatedWinnerId !== winnerId) {
        toast({
            variant: "destructive",
            title: "Error de Validación",
            description: "El marcador no coincide con el ganador seleccionado. Por favor, revisa los datos.",
        });
        return;
    }
    
    setIsSubmittingResult(true);
    const finalScore = formatScoreString();

    try {
        const loserId = selectedMatch.player1Id === winnerId ? selectedMatch.player2Id : selectedMatch.player1Id;
        let winnerInscriptionRef: any, loserInscriptionRef: any;

        // Pre-transaction: Get inscription documents if it's a ladder match
        const tournamentDoc = await getDoc(doc(db, "tournaments", selectedMatch.tournamentId));
        const tournamentData = tournamentDoc.data() as Tournament;

        if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && selectedMatch.challengeId) {
            const challengeDoc = await getDoc(doc(db, "challenges", selectedMatch.challengeId));
            if (!challengeDoc.exists()) throw new Error("Challenge not found for ladder logic");
            const challengeData = challengeDoc.data() as Challenge;

            const inscriptionsRef = collection(db, `inscriptions`);
            
            const winnerInscriptionQuery = query(inscriptionsRef, where("jugadorId", "==", winnerId), where("eventoId", "==", challengeData.eventoId), where("torneoId", "==", tournamentData.id));
            const winnerInscriptionsSnap = await getDocs(winnerInscriptionQuery);
            if (winnerInscriptionsSnap.empty) throw new Error("Winner inscription not found");
            winnerInscriptionRef = winnerInscriptionsSnap.docs[0].ref;

            const loserInscriptionQuery = query(inscriptionsRef, where("jugadorId", "==", loserId), where("eventoId", "==", challengeData.eventoId), where("torneoId", "==", tournamentData.id));
            const loserInscriptionsSnap = await getDocs(loserInscriptionQuery);
            if (loserInscriptionsSnap.empty) throw new Error("Loser inscription not found");
            loserInscriptionRef = loserInscriptionsSnap.docs[0].ref;
        }


      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, "matches", selectedMatch.id);
        const winnerRef = doc(db, "users", winnerId);
        const loserRef = doc(db, "users", loserId);
        
        const winnerDoc = await transaction.get(winnerRef);
        const loserDoc = await transaction.get(loserRef);

        if (!winnerDoc.exists() || !loserDoc.exists()) throw new Error("No se encontraron los datos de uno de los jugadores.");
        
        const winnerData = winnerDoc.data() as Player;
        const loserData = loserDoc.data() as Player;
        
        // --- Ladder Position Swap Logic ---
        if (tournamentData.tipoTorneo === 'Evento tipo Escalera' && selectedMatch.challengeId && winnerInscriptionRef && loserInscriptionRef) {
            const challengeRef = doc(db, "challenges", selectedMatch.challengeId);
            const challengeDoc = await transaction.get(challengeRef);
            if (!challengeDoc.exists()) throw new Error("Challenge not found for ladder logic");
            const challengeData = challengeDoc.data() as Challenge;
            
            const challengerIsWinner = winnerId === challengeData.retadorId;

            if (challengerIsWinner) {
                const winnerInscriptionDoc = await transaction.get(winnerInscriptionRef);
                const loserInscriptionDoc = await transaction.get(loserInscriptionRef);

                if (winnerInscriptionDoc.exists() && loserInscriptionDoc.exists()) {
                    const winnerInscriptionData = winnerInscriptionDoc.data() as Inscription;
                    const loserInscriptionData = loserInscriptionDoc.data() as Inscription;
                    
                    // Swap positions if challenger (winner) has a higher position number (is lower in rank)
                    if(winnerInscriptionData.posicionActual > loserInscriptionData.posicionActual) {
                        const winnerOldPosition = winnerInscriptionData.posicionActual;
                        const loserOldPosition = loserInscriptionData.posicionActual;
                        transaction.update(winnerInscriptionRef, { posicionActual: loserOldPosition });
                        transaction.update(loserInscriptionRef, { posicionActual: winnerOldPosition });
                    }
                }
            }
             transaction.update(challengeRef, { estado: 'Jugado' });
        }
        
        // --- Stat Updates ---
        const newWinnerWins = (winnerData.globalWins || 0) + 1;
        const newLoserLosses = (loserData.globalLosses || 0) + 1;
        
        transaction.update(matchRef, { winnerId: winnerId, status: "Completado", score: finalScore });
        transaction.update(winnerRef, { globalWins: newWinnerWins });
        transaction.update(loserRef, { globalLosses: newLoserLosses });

        // Calculate and update ELO if the tournament is ranked
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

  if (loadingPlayer || loadingMatches || loadingChallenges || loadingPlayers || loadingTournaments) {
    return <div>Cargando...</div>
  }
  
  if (!player) {
    return <div>No se encontraron datos del jugador.</div>
  }

  const totalGames = (player.globalWins || 0) + (player.globalLosses || 0);
  
  const getPlayerById = (id: string | undefined) => allPlayers?.find(p => p.uid === id);

  const getPlayersForMatch = (match: Match | null) => {
    if (!match || !allPlayers) return { player1: null, player2: null };
    const player1 = getPlayerById(match.player1Id);
    const player2 = getPlayerById(match.player2Id);
    return { player1, player2 };
  };

  const { player1: playerInSelectedMatch, player2: opponentInSelectedMatch } = getPlayersForMatch(selectedMatch);

  const handleScoreChange = (setIndex: number, playerKey: 'p1' | 'p2', value: string) => {
    const newScores = [...scores];
    newScores[setIndex][playerKey] = value;
    setScores(newScores);
  };


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
              Selecciona el ganador e introduce el marcador de la partida.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <RadioGroup onValueChange={setWinnerId} value={winnerId || ""} className="grid grid-cols-2 gap-4">
                {selectedMatch && playerInSelectedMatch && (
                    <div>
                        <RadioGroupItem value={playerInSelectedMatch.uid} id={`r1-${selectedMatch.id}`} className="sr-only" />
                        <Label 
                            htmlFor={`r1-${selectedMatch.id}`}
                            className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${winnerId === playerInSelectedMatch.uid ? 'border-primary' : ''}`}
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
                        <RadioGroupItem value={opponentInSelectedMatch.uid} id={`r2-${selectedMatch.id}`} className="sr-only" />
                        <Label 
                            htmlFor={`r2-${selectedMatch.id}`}
                            className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground ${winnerId === opponentInSelectedMatch.uid ? 'border-primary' : ''}`}
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
                         <Input className="text-center" value={scores[0].p1} onChange={(e) => handleScoreChange(0, 'p1', e.target.value)} />
                         <Input className="text-center" value={scores[1].p1} onChange={(e) => handleScoreChange(1, 'p1', e.target.value)} />
                         <Input className="text-center" value={scores[2].p1} onChange={(e) => handleScoreChange(2, 'p1', e.target.value)} />
                    </div>
                </div>
                 <div className="flex justify-around items-center gap-2">
                    <div className="w-1/3 text-sm truncate">{opponentInSelectedMatch?.displayName}</div>
                     <div className="flex-1 grid grid-cols-3 gap-2">
                         <Input className="text-center" value={scores[0].p2} onChange={(e) => handleScoreChange(0, 'p2', e.target.value)} />
                         <Input className="text-center" value={scores[1].p2} onChange={(e) => handleScoreChange(1, 'p2', e.target.value)} />
                         <Input className="text-center" value={scores[2].p2} onChange={(e) => handleScoreChange(2, 'p2', e.target.value)} />
                    </div>
                </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveResult} disabled={isSubmittingResult || !winnerId}>
              {isSubmittingResult && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

    
    

    