
"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import type { Player, Tournament, Match } from "@/types";
import { useDocument, useCollection } from "@/hooks/use-firestore";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { registerMatchResult } from "@/ai/flows/register-match-result";

// Re-using the result dialog logic
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";


export default function SchedulePage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const router = useRouter();
  const { user, userRole } = useAuth();
  
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const { data: matches, loading: loadingMatches } = useCollection<Match>('matches');

  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [scores, setScores] = useState([ { p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' } ]);
  const [isWinnerRadioDisabled, setIsWinnerRadioDisabled] = useState(false);
  const [isThirdSetDisabled, setIsThirdSetDisabled] = useState(true);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreInputErrors, setScoreInputErrors] = useState<boolean[][]>([ [false, false], [false, false], [false, false] ]);
  const [isRetirement, setIsRetirement] = useState(false);
  
  useEffect(() => {
    if (!loadingTournament && tournament) {
        if (userRole && userRole !== 'admin' && tournament.creatorId !== user?.uid) {
            router.push(`/dashboard/tournaments/${tournament.id}/bracket`);
        }
    }
  }, [tournament, userRole, user, loadingTournament, router]);
  
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
  
  const { player1: p1InSelectedMatch, player2: p2InSelectedMatch } = getPlayersForMatch(selectedMatch);


  // Score validation logic (re-used from dashboard)
   useEffect(() => {
    if (!isResultDialogOpen) return;

    const { player1: p1, player2: p2 } = getPlayersForMatch(selectedMatch);
    if (!p1 || !p2) return;
    
    const isSuperTiebreakFormat = tournament?.formatoScore === '2 Sets + Super Tiebreak';
    let p1SetsWon = 0, p2SetsWon = 0; let localError: string | null = null;
    const newScoreInputErrors: boolean[][] = [ [false, false], [false, false], [false, false] ];
    const validateSet = (score1Str: string, score2Str: string, setIndex: number, isSuperTiebreak: boolean = false) => {
        const score1 = parseInt(score1Str, 10); const score2 = parseInt(score2Str, 10);
        if (isNaN(score1) && isNaN(score2)) return null;
        const hasError = (msg: string, p1Error: boolean = true, p2Error: boolean = true) => {
            if (!localError) { localError = msg; }
            newScoreInputErrors[setIndex][0] = p1Error; newScoreInputErrors[setIndex][1] = p2Error;
        };
        if (isNaN(score1) || isNaN(score2)) { hasError('Ambos campos del set deben estar completos.'); return null; }
        if (score1 < 0 || score2 < 0) { hasError('Los juegos no pueden ser negativos.'); return null; }
        if (!isSuperTiebreak) {
            const winningScore = 6; const tiebreakScore = 7;
            if (score1 > tiebreakScore || score2 > tiebreakScore) { hasError(`Un set no puede tener más de ${tiebreakScore} juegos.`); return null; }
            if (score1 === score2 && score1 >= winningScore) { hasError(`Marcador inválido: ${score1}-${score2}. No puede haber empate en 6 o más.`); return null; }
            const isFinished = (score1 >= winningScore && score1 - score2 >= 2) || (score2 >= winningScore && score2 - score1 >= 2) || (score1 === tiebreakScore && score2 <= tiebreakScore -2) || (score2 === tiebreakScore && score1 <= tiebreakScore -2) || (score1 === tiebreakScore && score2 === (winningScore-1)) || (score2 === tiebreakScore && score1 === (winningScore-1)) || (score1 === tiebreakScore && score2 === winningScore) || (score2 === tiebreakScore && score1 === winningScore);
            const isValidScore = (s1:number, s2:number) => {
                if(s1 < winningScore && s2 < winningScore) return true;
                if(s1 === winningScore && s2 <= winningScore - 2) return true;
                if(s2 === winningScore && s1 <= winningScore - 2) return true;
                if(s1 === tiebreakScore && (s2 === winningScore -1 || s2 === winningScore)) return true;
                if(s2 === tiebreakScore && (s1 === winningScore -1 || s1 === winningScore)) return true;
                return false;
            }
            if (!isValidScore(score1, score2)) { hasError('Resultado de set inválido. Use 6-0..4, 7-5, o 7-6.'); return null; }
            if (isFinished) { if (score1 > score2) return 'p1'; else return 'p2'; }
            return null;
        } else {
            const winningScore = 10;
            const isFinished = (score1 >= winningScore || score2 >= winningScore) && Math.abs(score1 - score2) >= 2;
            if(isFinished) {
                if ((score1 > score2 ? score1 : score2) > winningScore && Math.abs(score1-score2) !== 2){ hasError(`Resultado de tie-break inválido. La diferencia debe ser 2.`); return null; }
                return score1 > score2 ? 'p1' : 'p2';
            }
            if((score1 >= winningScore || score2 >= winningScore) && Math.abs(score1-score2) < 2) { hasError('El Súper Tiebreak debe ganarse por 2 puntos de diferencia.'); }
            return null;
        }
    }
    for (let i = 0; i < 2; i++) {
        if (localError) continue;
        const set = scores[i]; const setWinner = validateSet(set.p1, set.p2, i, false);
        if (setWinner === 'p1') p1SetsWon++; else if (setWinner === 'p2') p2SetsWon++;
    }
    if (!localError && (p1SetsWon === 2 || p2SetsWon === 2)) { setIsThirdSetDisabled(true); } 
    else { setIsThirdSetDisabled(false);
        if (!localError && (p1SetsWon === 1 && p2SetsWon === 1)) {
             const isLastSetSuperTiebreak = isSuperTiebreakFormat; const set = scores[2];
             const setWinner = validateSet(set.p1, set.p2, 2, isLastSetSuperTiebreak);
             if (setWinner === 'p1') p1SetsWon++; else if (setWinner === 'p2') p2SetsWon++;
        }
    }
    setScoreError(localError); setScoreInputErrors(newScoreInputErrors);
    if (!localError && (p1SetsWon >= 2 || p2SetsWon >= 2)) {
        if (p1SetsWon >= 2) setWinnerId(p1.uid); else if (p2SetsWon >= 2) setWinnerId(p2.uid);
        setIsWinnerRadioDisabled(true);
    } else { setWinnerId(null); setIsWinnerRadioDisabled(false); }
  }, [scores, selectedMatch, allPlayers, tournament, isResultDialogOpen, getPlayersForMatch]);

  const handleOpenResultDialog = (match: Match) => {
    setSelectedMatch(match);
    setWinnerId(null);
    setScores([ { p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' } ]);
    setScoreError(null);
    setScoreInputErrors([ [false, false], [false, false], [false, false] ]);
    setIsThirdSetDisabled(true);
    setIsWinnerRadioDisabled(false);
    setIsRetirement(false);
    setIsResultDialogOpen(true);
  }
  
  const formatScoreString = () => {
    let scoreStr = scores.map(set => `${set.p1}-${set.p2}`).filter(setStr => setStr !== "-" && setStr !== "0-0" && setStr !== "" && !setStr.startsWith('-') && !setStr.endsWith('-')).join(', ');
    return scoreStr;
  };

  const handleScoreChange = (setIndex: number, playerKey: 'p1' | 'p2', value: string) => {
    const newScores = [...scores];
    newScores[setIndex][playerKey] = value.replace(/[^0-9]/g, '');
    setScores(newScores);
  };
  
  const handleSaveResult = async () => {
    if (!selectedMatch || !winnerId) { toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un ganador o el marcador está incompleto/inválido." }); return; }
    if (!user) { toast({ variant: "destructive", title: "Error de autenticación" }); return; }
    const { player1: p1, player2: p2 } = getPlayersForMatch(selectedMatch);
    if (!p1 || !p2) { toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los jugadores." }); return; }
    if (scoreError && !isRetirement) { toast({ variant: "destructive", title: "Marcador Inválido", description: scoreError }); return; }
    
    setIsSubmittingResult(true);
    const finalScore = formatScoreString();

    const payload = {
        matchId: selectedMatch.id,
        winnerId: winnerId,
        score: finalScore,
        isRetirement: isRetirement,
    };

    console.log('[FRONTEND] Calling registerMatchResult with payload:', payload);

    try {
       const result = await registerMatchResult(payload);

        if (result.success) {
            toast({ title: "¡Resultado Guardado!", description: result.message });
            setIsResultDialogOpen(false);
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo guardar el resultado." });
    } finally { setIsSubmittingResult(false); }
  };
  
  const tournamentMatches = matches?.filter(m => m.tournamentId === resolvedParams.id) || [];
  const canManage = userRole === 'admin' || tournament?.creatorId === user?.uid;
  const loading = loadingTournament || loadingAllPlayers || loadingMatches;
  const isSaveButtonDisabled = isSubmittingResult || !winnerId || (scoreError && !isRetirement);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando...</div>
  }
  if (!canManage) {
    return <div>No tienes permiso para ver esta página.</div>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Partidos del Torneo</CardTitle>
          <CardDescription>
            Administra y carga los resultados de todos los partidos del torneo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador 1</TableHead>
                <TableHead className="w-[50px] text-center"></TableHead>
                <TableHead>Jugador 2</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Acción / Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournamentMatches.length > 0 ? tournamentMatches.map(match => {
                const player1 = getPlayerById(match.player1Id);
                const player2 = getPlayerById(match.player2Id);
                return (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarImage src={player1?.avatar} /><AvatarFallback>{player1?.firstName?.substring(0, 1)}{player1?.lastName?.substring(0, 1)}</AvatarFallback></Avatar>
                        {player1?.displayName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold"><Swords className="h-5 w-5 mx-auto text-muted-foreground" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarImage src={player2?.avatar} /><AvatarFallback>{player2?.firstName?.substring(0, 1)}{player2?.lastName?.substring(0, 1)}</AvatarFallback></Avatar>
                        {player2?.displayName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant={match.status === 'Completado' ? 'secondary' : 'default'}>{match.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {match.status === 'Pendiente' ? (
                        <Button variant="outline" size="sm" onClick={() => handleOpenResultDialog(match)}>Cargar Resultado</Button>
                      ) : (
                         <div className="flex flex-col items-end">
                             <span className={`font-bold ${match.winnerId === player1?.uid ? 'text-primary' : (match.winnerId === player2?.uid ? 'text-destructive' : '')}`}>
                                {getPlayerById(match.winnerId)?.displayName}
                             </span>
                             {match.score && <span className="text-xs text-muted-foreground">{match.score}</span>}
                         </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No hay partidos generados para este torneo aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Resultado de la Partida</DialogTitle>
            <DialogDescription>
              Introduce el marcador final. El ganador se calculará automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
                <div className="flex justify-between items-center"><Label>Marcador</Label>{tournament && (<Badge variant="outline">{tournament.formatoScore || 'Sets estándar'}</Badge>)}</div>
                <div className="flex justify-around items-center"><div className="w-1/3 text-center font-bold">Jugador</div><div className="flex-1 grid grid-cols-3 gap-2"><div className="text-center text-sm font-medium text-muted-foreground">SET 1</div><div className="text-center text-sm font-medium text-muted-foreground">SET 2</div><div className="text-center text-sm font-medium text-muted-foreground">SET 3</div></div></div>
                <div className="flex justify-around items-center gap-2"><div className="w-1/3 text-sm truncate">{p1InSelectedMatch?.displayName}</div><div className="flex-1 grid grid-cols-3 gap-2"><Input className={cn("text-center", scoreInputErrors[0][0] && 'border-destructive')} value={scores[0].p1} onChange={(e) => handleScoreChange(0, 'p1', e.target.value)} /><Input className={cn("text-center", scoreInputErrors[1][0] && 'border-destructive')} value={scores[1].p1} onChange={(e) => handleScoreChange(1, 'p1', e.target.value)} /><Input className={cn("text-center", scoreInputErrors[2][0] && 'border-destructive')} value={scores[2].p1} onChange={(e) => handleScoreChange(2, 'p1', e.target.value)} disabled={isThirdSetDisabled} /></div></div>
                <div className="flex justify-around items-center gap-2"><div className="w-1/3 text-sm truncate">{p2InSelectedMatch?.displayName}</div><div className="flex-1 grid grid-cols-3 gap-2"><Input className={cn("text-center", scoreInputErrors[0][1] && 'border-destructive')} value={scores[0].p2} onChange={(e) => handleScoreChange(0, 'p2', e.target.value)} /><Input className={cn("text-center", scoreInputErrors[1][1] && 'border-destructive')} value={scores[1].p2} onChange={(e) => handleScoreChange(1, 'p2', e.target.value)} /><Input className={cn("text-center", scoreInputErrors[2][1] && 'border-destructive')} value={scores[2].p2} onChange={(e) => handleScoreChange(2, 'p2', e.target.value)} disabled={isThirdSetDisabled}/></div></div>
                {scoreError && (<p className="text-sm font-medium text-destructive text-center pt-2">{scoreError}</p>)}
            </div>
            
            <div className="space-y-2">
                <Label>Ganador</Label>
                <RadioGroup onValueChange={setWinnerId} value={winnerId || ''} disabled={isWinnerRadioDisabled}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={p1InSelectedMatch?.uid || ''} id={`admin-p1-winner-${p1InSelectedMatch?.uid}`} />
                    <Label htmlFor={`admin-p1-winner-${p1InSelectedMatch?.uid}`}>{p1InSelectedMatch?.displayName}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={p2InSelectedMatch?.uid || ''} id={`admin-p2-winner-${p2InSelectedMatch?.uid}`} />
                    <Label htmlFor={`admin-p2-winner-${p2InSelectedMatch?.uid}`}>{p2InSelectedMatch?.displayName}</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">El ganador se selecciona automáticamente al ingresar un marcador válido. Puedes anularlo manualmente si es necesario.</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="retirement-checkbox-admin" checked={isRetirement} onCheckedChange={(checked) => setIsRetirement(checked as boolean)} />
              <Label htmlFor="retirement-checkbox-admin">¿El partido terminó por retiro?</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>Cancelar</Button>
            <AlertDialog>
                <AlertDialogTrigger asChild><Button disabled={isSaveButtonDisabled}>Guardar Resultado</Button></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Resultado</AlertDialogTitle><AlertDialogDescription>¿Estás seguro? Esta acción no se puede deshacer.</AlertDialogDescription>
                         <div className="py-4 font-medium text-foreground text-sm text-left"><div><strong>Ganador:</strong> {getPlayerById(winnerId)?.displayName}</div><div><strong>Marcador:</strong> {formatScoreString()}</div></div>
                    </AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleSaveResult} disabled={isSubmittingResult}>{isSubmittingResult && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar y Guardar</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
