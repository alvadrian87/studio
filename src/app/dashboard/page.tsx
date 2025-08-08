
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Check, Clock, Swords, Trophy, X, ShieldQuestion, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth";
import type { Player, Match, Challenge } from "@/hooks/use-firestore";
import { useCollection, useDocument } from "@/hooks/use-firestore";
import { doc, updateDoc, addDoc, collection, writeBatch, runTransaction } from "firebase/firestore";
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
  
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  const pendingChallenges = useMemo(() => {
    if (!allChallenges || !user) return [];
    return allChallenges.filter(c => c.challengedId === user.uid && c.status === 'Pendiente');
  }, [allChallenges, user]);

  const userMatches = useMemo(() => {
    if (!allMatches || !user) return [];
    return allMatches.filter(m => m.player1Id === user.uid || m.player2Id === user.uid)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMatches, user]);

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
          player1Id: challenge.challengerId,
          player2Id: challenge.challengedId,
          winnerId: null,
          status: 'Pendiente',
          date: format(new Date(), "yyyy-MM-dd HH:mm"),
          tournamentId: challenge.tournamentId,
        });

        // Update the challenge
        batch.update(challengeRef, { status: "Aceptado" });

        await batch.commit();

        toast({ title: "¡Desafío Aceptado!", description: "La partida ha sido creada." });
      } else {
        await updateDoc(challengeRef, { status: "Rechazado" });
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
    setIsResultDialogOpen(true);
  }

  const handleSaveResult = async () => {
    if (!selectedMatch || !winnerId) {
        toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un ganador." });
        return;
    }
    setIsSubmittingResult(true);

    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, "matches", selectedMatch.id);
        const loserId = selectedMatch.player1Id === winnerId ? selectedMatch.player2Id : selectedMatch.player1Id;

        const winnerRef = doc(db, "users", winnerId);
        const loserRef = doc(db, "users", loserId);
        
        const winnerDoc = await transaction.get(winnerRef);
        const loserDoc = await transaction.get(loserRef);

        if (!winnerDoc.exists() || !loserDoc.exists()) {
          throw new Error("No se encontraron los datos de uno de los jugadores.");
        }

        const newWinnerWins = (winnerDoc.data().globalWins || 0) + 1;
        const newLoserLosses = (loserDoc.data().globalLosses || 0) + 1;

        // Update match
        transaction.update(matchRef, { winnerId: winnerId, status: "Completado" });
        // Update winner
        transaction.update(winnerRef, { globalWins: newWinnerWins });
        // Update loser
        transaction.update(loserRef, { globalLosses: newLoserLosses });
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

  if (loadingPlayer || loadingMatches || loadingChallenges || loadingPlayers) {
    return <div>Cargando...</div>
  }
  
  if (!player) {
    return <div>No se encontraron datos del jugador.</div>
  }

  const totalGames = (player.globalWins || 0) + (player.globalLosses || 0);
  
  const getPlayerById = (id: string | undefined) => allPlayers?.find(p => p.uid === id);
  const playerInSelectedMatch = getPlayerById(selectedMatch?.player1Id);
  const opponentInSelectedMatch = getPlayerById(selectedMatch?.player2Id);


  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido de nuevo, {player.displayName || 'Jugador'}!</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clasificación Global</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#1</div>
            <p className="text-xs text-muted-foreground">Pendiente de implementación</p>
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
                              <AvatarFallback>{opponent?.displayName?.substring(0, 2) || 'O'}</AvatarFallback>
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
                            match.winnerId === user?.uid ? <span className="font-bold text-primary">Victoria</span> : <span className="font-bold text-destructive">Derrota</span>
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
                      <p className="font-medium">{allPlayers?.find(p => p.uid === challenge.challengerId)?.displayName}</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Resultado de la Partida</DialogTitle>
            <DialogDescription>
              Selecciona el ganador de la partida entre {playerInSelectedMatch?.displayName} y {opponentInSelectedMatch?.displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <RadioGroup onValueChange={setWinnerId} value={winnerId || ""}>
              {selectedMatch && playerInSelectedMatch && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={playerInSelectedMatch.uid} id={`r1-${selectedMatch.id}`} />
                  <Label htmlFor={`r1-${selectedMatch.id}`}>{playerInSelectedMatch.displayName}</Label>
                </div>
              )}
              {selectedMatch && opponentInSelectedMatch && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={opponentInSelectedMatch.uid} id={`r2-${selectedMatch.id}`} />
                  <Label htmlFor={`r2-${selectedMatch.id}`}>{opponentInSelectedMatch.displayName}</Label>
                </div>
              )}
            </RadioGroup>
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

    