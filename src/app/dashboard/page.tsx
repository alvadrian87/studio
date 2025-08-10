
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Check, Swords, Trophy, X, ShieldQuestion, Loader2, Users, Handshake } from "lucide-react"
import { useAuth } from "@/hooks/use-auth";
import type { Player, Match, Challenge, Tournament, Invitation, Inscription } from "@/types";
import { useCollection, useDocument } from "@/hooks/use-firestore";
import { doc, updateDoc, addDoc, collection, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";


export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const { data: player, loading: loadingPlayer } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  const { data: allMatches, loading: loadingMatches } = useCollection<Match>('matches');
  const { data: allChallenges, loading: loadingChallenges } = useCollection<Challenge>('challenges');
  const { data: allPlayers, loading: loadingPlayers } = useCollection<Player>('users');
  const { data: allTournaments, loading: loadingTournaments } = useCollection<Tournament>('tournaments');
  const { data: allInvitations, loading: loadingInvitations } = useCollection<Invitation>('invitations');
  const { data: allInscriptions, loading: loadingInscriptions } = useCollection<Inscription>('inscriptions');


  const pendingChallenges = useMemo(() => {
    if (!allChallenges || !user || !allInscriptions) return [];
    
    // Find all inscriptions the current user is part of
    const userInscriptionIds = allInscriptions.filter(i => i.jugadoresIds.includes(user.uid)).map(i => i.id);

    // Filter challenges where the user's inscription is the one being challenged
    return allChallenges.filter(c => userInscriptionIds.includes(c.desafiadoId) && c.estado === 'Pendiente');
  }, [allChallenges, user, allInscriptions]);


  const getInscriptionById = (inscriptionId: string) => {
    if (!allInscriptions) return null;
    return allInscriptions.find(i => i.id === inscriptionId);
  }

  const getPlayersFromInscription = (inscription: Inscription | null) => {
    if (!inscription || !allPlayers) return [];
    return inscription.jugadoresIds.map(playerId => allPlayers.find(p => p.uid === playerId)).filter(Boolean) as Player[];
  }

  const pendingPartnerInvitations = useMemo(() => {
    if (!allInvitations || !user) return [];
    return allInvitations.filter(i => i.invitadoId === user.uid && i.estado === 'pendiente');
  }, [allInvitations, user]);

  const userMatches = useMemo(() => {
    if (!allMatches || !user) return [];
    return allMatches.filter(m => m.jugadoresIds.includes(user.uid))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allMatches, user]);
  
  const playerRank = useMemo(() => {
    if (!allPlayers || !player) return 0;
    const sortedPlayers = [...allPlayers].sort((a, b) => b.rankPoints - a.rankPoints);
    return sortedPlayers.findIndex(p => p.uid === player.uid) + 1;
  }, [allPlayers, player]);

  const getOpponent = (match: Match) => {
    if (!user || !allPlayers) return { name: 'Desconocido', avatar: undefined, fallback: '?' };
    
    const opponentIds = match.jugadoresIds.filter(id => id !== user.uid);
    if (opponentIds.length === 0) return { name: 'Desconocido', avatar: undefined, fallback: '?' };

    if (opponentIds.length === 1) { // Singles
      const opponent = allPlayers.find(p => p.uid === opponentIds[0]);
      return {
        name: opponent?.displayName || 'Desconocido',
        avatar: opponent?.avatar,
        fallback: `${opponent?.firstName?.substring(0,1)}${opponent?.lastName?.substring(0,1)}`
      };
    } else { // Doubles
      const opponents = opponentIds.map(id => allPlayers.find(p => p.uid === id));
      return {
        name: opponents.map(p => p?.displayName || '?').join(' / '),
        avatar: undefined, // No avatar for doubles pair
        fallback: opponents.map(p => p?.firstName?.substring(0,1)).join('')
      }
    }
  }
  
  const handleChallengeResponse = async (challengeId: string, accepted: boolean) => {
    const challengeRef = doc(db, "challenges", challengeId);
    try {
      if (accepted) {
        const challenge = allChallenges?.find(c => c.id === challengeId);
        if (!challenge) throw new Error("Desafío no encontrado");

        const retadorInscriptionRef = doc(db, `tournaments/${challenge.torneoId}/inscriptions/${challenge.retadorId}`);
        const desafiadoInscriptionRef = doc(db, `tournaments/${challenge.torneoId}/inscriptions/${challenge.desafiadoId}`);

        const [retadorInscriptionSnap, desafiadoInscriptionSnap] = await Promise.all([
          getDoc(retadorInscriptionRef),
          getDoc(desafiadoInscriptionSnap)
        ]);

        if (!retadorInscriptionSnap.exists() || !desafiadoInscriptionSnap.exists()) {
          throw new Error("No se pudieron encontrar las inscripciones de los jugadores.");
        }

        const retadorInscription = retadorInscriptionSnap.data() as Inscription;
        const desafiadoInscription = desafiadoInscriptionSnap.data() as Inscription;

        const batch = writeBatch(db);

        const matchRef = doc(collection(db, "matches"));
        batch.set(matchRef, {
          player1Id: challenge.retadorId, // inscription ID
          player2Id: challenge.desafiadoId, // inscription ID
          jugadoresIds: [...retadorInscription.jugadoresIds, ...desafiadoInscription.jugadoresIds],
          winnerId: null,
          status: 'Pendiente',
          date: format(new Date(), "yyyy-MM-dd HH:mm"),
          tournamentId: challenge.torneoId,
          score: null,
          challengeId: challenge.id,
        });

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

  const handleInvitationResponse = async (invitation: Invitation, accepted: boolean) => {
    const invitationRef = doc(db, "invitations", invitation.id);
    try {
        if (accepted) {
            const batch = writeBatch(db);
            const inscriptionCollectionRef = collection(db, `tournaments/${invitation.torneoId}/inscriptions`);
            const newInscriptionRef = doc(inscriptionCollectionRef);

            const newInscription: Omit<Inscription, 'id'> = {
                torneoId: invitation.torneoId,
                eventoId: invitation.eventoId,
                jugadoresIds: [invitation.invitadorId, invitation.invitadoId],
                fechaInscripcion: new Date().toISOString(),
                status: 'Confirmado',
                posicionInicial: 0, // Should be calculated on the fly or by a function
                posicionActual: 0,  // Should be calculated on the fly or by a function
                indiceActividad: 0,
                desafioPendienteId: null
            };
            batch.set(newInscriptionRef, newInscription);
            batch.update(invitationRef, { estado: 'aceptada' });
            await batch.commit();
            toast({ title: "¡Invitación Aceptada!", description: `Te has inscrito en ${invitation.nombreTorneo} junto a ${allPlayers?.find(p => p.uid === invitation.invitadorId)?.displayName}`});
            router.push(`/dashboard/tournaments/${invitation.torneoId}/bracket`);
        } else {
            await updateDoc(invitationRef, { estado: 'rechazada' });
            toast({ title: "Invitación Rechazada" });
            // Here you could add a cloud function to notify the inviter.
        }
    } catch (error) {
        console.error("Error al responder a la invitación:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la respuesta a la invitación." });
    }
  }


  const loading = loadingPlayer || loadingMatches || loadingChallenges || loadingPlayers || loadingTournaments || loadingInvitations || loadingInscriptions;


  if (loading) {
    return <div>Cargando...</div>
  }
  
  if (!player) {
    return <div>No se encontraron datos del jugador.</div>
  }

  const totalGames = (player.globalWins || 0) + (player.globalLosses || 0);


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
                              <AvatarImage src={opponent?.avatar} alt={opponent?.name} />
                              <AvatarFallback>{opponent?.fallback}</AvatarFallback>
                           </Avatar>
                           <span className="font-medium">{opponent?.name || 'Desconocido'}</span>
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
                            <Badge variant="outline">Pendiente</Badge>
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
        <div className="lg:col-span-3 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Desafíos de Escalera</CardTitle>
                    <CardDescription>Desafíos que esperan tu acción.</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingChallenges.length > 0 ? (
                    <ul className="space-y-4">
                        {pendingChallenges.map(challenge => {
                           const retadorInscription = getInscriptionById(challenge.retadorId);
                           const retadorPlayers = getPlayersFromInscription(retadorInscription);

                           return (
                             <li key={challenge.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div>
                                <p className="font-medium">{retadorPlayers.map(p => p.displayName).join(' / ')}</p>
                                <p className="text-sm text-muted-foreground">Te ha desafiado en: <span className="font-semibold text-primary">{challenge.tournamentName}</span></p>
                                </div>
                                <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleChallengeResponse(challenge.id, false)}>Rechazar</Button>
                                <Button size="sm" onClick={() => handleChallengeResponse(challenge.id, true)}>Aceptar</Button>
                                </div>
                            </li>
                           )
                        })}
                    </ul>
                    ) : (
                    <div className="text-center py-4 text-muted-foreground flex flex-col items-center">
                        <ShieldQuestion className="h-8 w-8 mb-2" />
                        <p>No tienes desafíos pendientes.</p>
                    </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invitaciones de Pareja</CardTitle>
                    <CardDescription>Invitaciones para torneos de dobles.</CardDescription>
                </CardHeader>
                <CardContent>
                    {pendingPartnerInvitations.length > 0 ? (
                    <ul className="space-y-4">
                        {pendingPartnerInvitations.map(invitation => (
                        <li key={invitation.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                            <p className="font-medium">{allPlayers?.find(p => p.uid === invitation.invitadorId)?.displayName}</p>
                            <p className="text-sm text-muted-foreground">Torneo: <span className="font-semibold text-primary">{invitation.nombreTorneo}</span></p>
                            </div>
                            <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleInvitationResponse(invitation, false)}>Rechazar</Button>
                            <Button size="sm" onClick={() => handleInvitationResponse(invitation, true)}>Aceptar</Button>
                            </div>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <div className="text-center py-4 text-muted-foreground flex flex-col items-center">
                        <Handshake className="h-8 w-8 mb-2" />
                        <p>No tienes invitaciones pendientes.</p>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  )
}
