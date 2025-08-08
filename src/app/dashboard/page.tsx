
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Check, Clock, Swords, Trophy, X, ShieldQuestion, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth";
import type { Player, Match, Challenge, Tournament, Inscription } from "@/types";
import { useCollection, useDocument } from "@/hooks/use-firestore";
import { doc, updateDoc, addDoc, collection, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { registerMatchResult } from "@/ai/flows/register-match-result";


export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // All hooks are now at the top
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
  const [isThirdSetDisabled, setIsThirdSetDisabled] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreInputErrors, setScoreInputErrors] = useState<boolean[][]>([
    [false, false],
    [false, false],
    [false, false],
  ]);
  const [isRetirement, setIsRetirement] = useState(false);

  const getPlayerById = useCallback((id: string | undefined) => {
    if (!id) return null;
    return allPlayers?.find(p => p.uid === id);
  }, [allPlayers]);

  const getPlayersForMatch = useCallback((match: Match | null) => {
    if (!match || !allPlayers) return { player1: null, player2: null };
    const player1 = getPlayerById(match.player1Id);
    const player2 = getPlayerById(match.player2Id);
    return { player1, player2 };
  }, [allPlayers, getPlayerById]);

  useEffect(() => {
    if (!isResultDialogOpen) return;

    const { player1: p1, player2: p2 } = getPlayersForMatch(selectedMatch);
    if (!p1 || !p2) return;
    
    if (isRetirement) {
        setScoreError(null);
        setScoreInputErrors([ [false, false], [false, false], [false, false] ]);
        setIsWinnerRadioDisabled(false);
        setIsThirdSetDisabled(false);
        return;
    }
    
    const tournamentId = selectedMatch?.tournamentId;
    const tournament = allTournaments?.find(t => t.id === tournamentId);
    const isSuperTiebreakFormat = tournament?.formatoScore === '2 Sets + Super Tiebreak';

    let p1SetsWon = 0;
    let p2SetsWon = 0;
    let localError: string | null = null;
    const newScoreInputErrors: boolean[][] = [ [false, false], [false, false], [false, false] ];

    const validateSet = (score1Str: string, score2Str: string, setIndex: number, isSuperTiebreak: boolean = false) => {
        const score1 = parseInt(score1Str, 10);
        const score2 = parseInt(score2Str, 10);

        if (isNaN(score1) && isNaN(score2)) return null;

        const hasError = (msg: string, p1Error: boolean = true, p2Error: boolean = true) => {
            if (!localError) { // Only set first error
                localError = msg;
            }
            newScoreInputErrors[setIndex][0] = p1Error;
            newScoreInputErrors[setIndex][1] = p2Error;
        };
        
        if (isNaN(score1) || isNaN(score2)) {
             hasError('Ambos campos del set deben estar completos.');
             return null;
        }

        if (score1 < 0 || score2 < 0) {
            hasError('Los juegos no pueden ser negativos.');
            return null;
        }

        if (!isSuperTiebreak) {
            const winningScore = 6;
            const tiebreakScore = 7;
            
            if (score1 > tiebreakScore || score2 > tiebreakScore) {
                hasError(`Un set no puede tener más de ${tiebreakScore} juegos.`);
                return null;
            }
             
            if (score1 === score2 && score1 >= winningScore) {
                hasError(`Marcador inválido: ${score1}-${score2}. No puede haber empate en 6 o más.`);
                return null;
            }
             
            const isFinished = (score1 >= winningScore && score1 - score2 >= 2) || 
                               (score2 >= winningScore && score2 - score1 >= 2) ||
                               (score1 === tiebreakScore && score2 <= tiebreakScore -2) || 
                               (score2 === tiebreakScore && score1 <= tiebreakScore -2) ||
                               (score1 === tiebreakScore && score2 === (winningScore-1)) || // 7-5
                               (score2 === tiebreakScore && score1 === (winningScore-1)) || // 5-7
                               (score1 === tiebreakScore && score2 === winningScore) || // 7-6
                               (score2 === tiebreakScore && score1 === winningScore); // 6-7

            const isValidScore = (s1:number, s2:number) => {
                if(s1 < winningScore && s2 < winningScore) return true; // not finished yet
                if(s1 === winningScore && s2 <= winningScore - 2) return true; // 6-4, 6-3, etc.
                if(s2 === winningScore && s1 <= winningScore - 2) return true;
                if(s1 === tiebreakScore && (s2 === winningScore -1 || s2 === winningScore)) return true; // 7-5 or 7-6
                if(s2 === tiebreakScore && (s1 === winningScore -1 || s1 === winningScore)) return true; // 7-5 or 7-6
                return false;
            }
            
            if (!isValidScore(score1, score2)) {
                 hasError('Resultado de set inválido. Use 6-0..4, 7-5, o 7-6.');
                 return null;
            }
            
            if (isFinished) {
                 if (score1 > score2) return 'p1'; else return 'p2';
            }
            
            return null;

        } else { // Super Tiebreak Validation
            const winningScore = 10;
            const isFinished = (score1 >= winningScore || score2 >= winningScore) && Math.abs(score1 - score2) >= 2;
            
            if(isFinished) {
                if ((score1 > score2 ? score1 : score2) > winningScore && Math.abs(score1-score2) !== 2){
                    hasError(`Resultado de tie-break inválido. La diferencia debe ser 2.`);
                    return null;
                }
                return score1 > score2 ? 'p1' : 'p2';
            }
            
            if((score1 >= winningScore || score2 >= winningScore) && Math.abs(score1-score2) < 2) {
                hasError('El Súper Tiebreak debe ganarse por 2 puntos de diferencia.');
            }
            
            return null;
        }
    }

    // Validate first two sets
    for (let i = 0; i < 2; i++) {
        if (localError) continue;
        const set = scores[i];
        const setWinner = validateSet(set.p1, set.p2, i, false);
        if (setWinner === 'p1') p1SetsWon++;
        else if (setWinner === 'p2') p2SetsWon++;
    }

    if (!localError && (p1SetsWon === 2 || p2SetsWon === 2)) {
        setIsThirdSetDisabled(true);
    } else {
        setIsThirdSetDisabled(false);
        // Validate third set only if needed
        if (!localError && (p1SetsWon === 1 && p2SetsWon === 1)) {
             const isLastSetSuperTiebreak = isSuperTiebreakFormat;
             const set = scores[2];
             const setWinner = validateSet(set.p1, set.p2, 2, isLastSetSuperTiebreak);
             if (setWinner === 'p1') p1SetsWon++;
             else if (setWinner === 'p2') p2SetsWon++;
        }
    }


    setScoreError(localError);
    setScoreInputErrors(newScoreInputErrors);

    if (!localError && (p1SetsWon >= 2 || p2SetsWon >= 2)) {
        if (p1SetsWon >= 2) setWinnerId(p1.uid);
        else if (p2SetsWon >= 2) setWinnerId(p2.uid);
        setIsWinnerRadioDisabled(true);
    } else {
        setWinnerId(null);
        setIsWinnerRadioDisabled(false);
    }

}, [scores, selectedMatch, allPlayers, allTournaments, isResultDialogOpen, getPlayersForMatch, isRetirement]);


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
    setIsRetirement(false);
    setIsThirdSetDisabled(false);
    setIsResultDialogOpen(true);
  }
  
  const formatScoreString = () => {
    let scoreStr = scores
      .map(set => `${set.p1}-${set.p2}`)
      .filter(setStr => setStr !== "-" && setStr !== "0-0" && setStr !== "" && !setStr.startsWith('-') && !setStr.endsWith('-') )
      .join(', ');
    if (isRetirement) {
        scoreStr += " (Ret.)";
    }
    return scoreStr;
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

    if (!isRetirement) {
        let p1SetsWon = 0;
        let p2SetsWon = 0;
        
        scores.forEach((set, index) => {
            if(isThirdSetDisabled && index === 2) return;
            const score1 = parseInt(set.p1);
            const score2 = parseInt(set.p2);
            if(isNaN(score1) || isNaN(score2)) return;

            if (score1 > score2) p1SetsWon++;
            else if (score2 > score1) p2SetsWon++;
        });
        
        const calculatedWinnerId = p1SetsWon > p2SetsWon ? p1.uid : (p2SetsWon > p1SetsWon ? p2.uid : null);
        if (calculatedWinnerId !== winnerId) {
            toast({
                variant: "destructive",
                title: "Error de Validación",
                description: "El marcador no coincide con el ganador seleccionado o está incompleto. Por favor, revisa los datos.",
            });
            return;
        }
    }
    
    setIsSubmittingResult(true);
    const finalScore = formatScoreString();

    try {
        const result = await registerMatchResult({
            matchId: selectedMatch.id,
            winnerId: winnerId,
            score: finalScore,
            isRetirement: isRetirement,
        });

        if (result.success) {
            toast({ title: "¡Resultado Guardado!", description: result.message });
            setIsResultDialogOpen(false);
            setSelectedMatch(null);
        } else {
            throw new Error(result.message);
        }

    } catch (error: any) {
      console.error("Error al guardar el resultado: ", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo guardar el resultado." });
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
  const tournamentInSelectedMatch = allTournaments?.find(t => t.id === selectedMatch?.tournamentId);


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
                <div className="flex justify-between items-center">
                    <Label>Marcador</Label>
                    {tournamentInSelectedMatch && (
                        <Badge variant="outline">{tournamentInSelectedMatch.formatoScore || 'Sets estándar'}</Badge>
                    )}
                </div>
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
                         <Input className={cn("text-center", scoreInputErrors[0][0] && 'border-destructive')} value={scores[0].p1} onChange={(e) => handleScoreChange(0, 'p1', e.target.value)} disabled={isRetirement} />
                         <Input className={cn("text-center", scoreInputErrors[1][0] && 'border-destructive')} value={scores[1].p1} onChange={(e) => handleScoreChange(1, 'p1', e.target.value)} disabled={isRetirement} />
                         <Input className={cn("text-center", scoreInputErrors[2][0] && 'border-destructive')} value={scores[2].p1} onChange={(e) => handleScoreChange(2, 'p1', e.target.value)} disabled={isRetirement || isThirdSetDisabled} />
                    </div>
                </div>
                 <div className="flex justify-around items-center gap-2">
                    <div className="w-1/3 text-sm truncate">{opponentInSelectedMatch?.displayName}</div>
                     <div className="flex-1 grid grid-cols-3 gap-2">
                         <Input className={cn("text-center", scoreInputErrors[0][1] && 'border-destructive')} value={scores[0].p2} onChange={(e) => handleScoreChange(0, 'p2', e.target.value)} disabled={isRetirement}/>
                         <Input className={cn("text-center", scoreInputErrors[1][1] && 'border-destructive')} value={scores[1].p2} onChange={(e) => handleScoreChange(1, 'p2', e.target.value)} disabled={isRetirement}/>
                         <Input className={cn("text-center", scoreInputErrors[2][1] && 'border-destructive')} value={scores[2].p2} onChange={(e) => handleScoreChange(2, 'p2', e.target.value)} disabled={isRetirement || isThirdSetDisabled}/>
                    </div>
                </div>
                {scoreError && (
                    <p className="text-sm font-medium text-destructive text-center pt-2">{scoreError}</p>
                )}
            </div>

            <div className="items-top flex space-x-2 pt-4">
                <Checkbox id="retirement" checked={isRetirement} onCheckedChange={(checked) => setIsRetirement(checked as boolean)} />
                <div className="grid gap-1.5 leading-none">
                    <label
                    htmlFor="retirement"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                    Partido finalizado por retiro
                    </label>
                    <p className="text-sm text-muted-foreground">
                    Marca esta casilla si un jugador se retiró. Podrás guardar un resultado incompleto.
                    </p>
                </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancelar</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button disabled={isSubmittingResult || !winnerId || !!scoreError || (!isRetirement && !isWinnerRadioDisabled)}>
                        Guardar Resultado
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Resultado</AlertDialogTitle>
                         <AlertDialogDescription>
                           ¿Estás seguro de que quieres registrar este resultado? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                         <div className="py-4 font-medium text-foreground text-sm text-left">
                            <div><strong>Ganador:</strong> {getPlayerById(winnerId)?.displayName}</div>
                            <div><strong>Marcador:</strong> {formatScoreString()}</div>
                        </div>
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
