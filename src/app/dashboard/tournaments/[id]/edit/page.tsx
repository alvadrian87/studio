
"use client";

import { use, useEffect, useState } from "react";
import type { Player, Tournament, TournamentEvent, Inscription, Match } from "@/types";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function EditTournamentPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: inscriptions, loading: loadingInscriptions } = useCollection<Inscription>(`tournaments/${resolvedParams.id}/inscriptions`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [generatingBracket, setGeneratingBracket] = useState<string | null>(null);


  useEffect(() => {
    if (tournament) {
      const fetchEvents = async () => {
        setLoadingEvents(true);
        const eventsQuery = query(collection(db, "eventos"), where("torneoId", "==", tournament.id));
        const eventsSnapshot = await getDocs(eventsQuery);
        const tournamentEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentEvent));
        setEvents(tournamentEvents);
        setLoadingEvents(false);
      };
      fetchEvents();
    }
  }, [tournament]);

  const getPlayerDetails = (playerId: string) => {
    return allPlayers?.find(p => p.uid === playerId);
  };

  const getEventInscriptions = (eventId: string) => {
    if (!inscriptions) return [];
    return inscriptions
      .filter(i => i.eventoId === eventId)
      .map(i => {
         const playerIds = Array.isArray(i.jugadoresIds) ? i.jugadoresIds : (i.jugadorId ? [i.jugadorId] : []);
         const players = playerIds.map(getPlayerDetails).filter(Boolean) as Player[];
         const displayName = players.map(p => p.displayName).join(' / ');
        return {
            ...i,
            playerDetails: players.length === 1 ? players[0] : null,
            displayName: displayName
        }
      });
  }

  const handleGenerateBracket = async (event: TournamentEvent) => {
    if (!tournament || !event.id) return;
    setGeneratingBracket(event.id);
    
    const participants = getEventInscriptions(event.id);
    if (participants.length < 2) {
      toast({ variant: "destructive", title: "No hay suficientes jugadores", description: "Se necesitan al menos 2 jugadores para generar un bracket." });
      setGeneratingBracket(null);
      return;
    }

    const shuffledParticipants = participants.sort(() => 0.5 - Math.random());
    
    const batch = writeBatch(db);
    const totalPlayers = shuffledParticipants.length;
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalPlayers)));
    const byes = nextPowerOfTwo - totalPlayers;
    const firstRoundMatches = (totalPlayers - byes) / 2;

    const playersWithBye = shuffledParticipants.slice(0, byes);
    const playersInFirstRound = shuffledParticipants.slice(byes);

    // Create matches for players with byes (they auto-win round 1)
    playersWithBye.forEach(participant => {
        const newMatch: Omit<Match, 'id'> = {
            tournamentId: tournament.id,
            eventoId: event.id!,
            roundNumber: 1,
            player1Id: participant.id,
            player2Id: null, // No opponent
            jugadoresIds: participant.jugadoresIds || [],
            winnerId: participant.id, // Auto-win
            status: 'Completado',
            date: format(new Date(), "yyyy-MM-dd HH:mm"),
            score: "BYE",
            challengeId: '',
            isBye: true,
        };
        const matchRef = doc(collection(db, "matches"));
        batch.set(matchRef, newMatch);
    });

    // Create matches for the first round
    for (let i = 0; i < firstRoundMatches; i++) {
        const player1 = playersInFirstRound[i * 2];
        const player2 = playersInFirstRound[i * 2 + 1];

        const newMatch: Omit<Match, 'id'> = {
            tournamentId: tournament.id,
            eventoId: event.id!,
            roundNumber: 1,
            player1Id: player1.id,
            player2Id: player2.id,
            jugadoresIds: [...(player1.jugadoresIds || []), ...(player2.jugadoresIds || [])],
            winnerId: null,
            status: 'Pendiente',
            date: format(new Date(), "yyyy-MM-dd HH:mm"),
            score: null,
            challengeId: '',
        };
        const matchRef = doc(collection(db, "matches"));
        batch.set(matchRef, newMatch);
    }

    try {
      // Mark the tournament and event as in progress
      const tournamentRef = doc(db, "tournaments", tournament.id);
      batch.update(tournamentRef, { status: "En Curso" });

      const eventRef = doc(db, "eventos", event.id);
      batch.update(eventRef, { status: "En Curso" });

      await batch.commit();

      // We need to update the local state to reflect the change
      setEvents(prevEvents => prevEvents.map(e => e.id === event.id ? { ...e, status: "En Curso" } : e));

      toast({ title: "¡Bracket Generado!", description: `Se han creado los partidos para la categoría ${event.nombre}.` });
    } catch(error) {
      console.error("Error al generar el bracket: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el bracket." });
    } finally {
      setGeneratingBracket(null);
    }
  };


  if (loadingTournament || loadingEvents || loadingInscriptions || loadingAllPlayers) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando detalles del torneo...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>;
  }

  return (
    <>
        <div className="flex items-center justify-between space-y-2">
            <div className="flex flex-col w-full">
                <h1 className="text-3xl font-bold tracking-tight">Administrar Torneo</h1>
                <p className="text-muted-foreground">Revisa los detalles, categorías e inscripciones de tu torneo.</p>
            </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                     <div>
                        <p className="font-medium text-muted-foreground">Nombre</p>
                        <p>{tournament.nombreTorneo}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">Tipo</p>
                        <p><Badge>{tournament.tipoTorneo}</Badge></p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">Fechas</p>
                        <p>{new Date(tournament.fechaInicio).toLocaleDateString()} - {new Date(tournament.fechaFin).toLocaleDateString()}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">Ubicación</p>
                        <p>{tournament.ubicacion}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">Estado</p>
                        <p><Badge variant={tournament.status === 'En Curso' ? 'default' : 'secondary'}>{tournament.status}</Badge></p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">Ranking</p>
                        <p><Badge variant={tournament.isRanked ? 'default' : 'secondary'}>{tournament.isRanked ? "Sí, afecta ELO" : "No, es amistoso"}</Badge></p>
                    </div>
                </CardContent>
            </Card>
            <div className="lg:col-span-2 space-y-6">
                {events.length > 0 ? (
                    <Tabs defaultValue={events.length > 0 ? events[0].id : ''}>
                        <TabsList>
                            {events.map((event) => (
                                <TabsTrigger key={event.id} value={event.id!}>{event.nombre}</TabsTrigger>
                            ))}
                        </TabsList>
                        {events.map(event => {
                            const eventParticipants = getEventInscriptions(event.id!);
                            const isGenerating = generatingBracket === event.id;
                            const isGenerated = event.status === "En Curso";
                            return (
                                <TabsContent key={event.id} value={event.id!}>
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <div>
                                                <CardTitle>{event.nombre}</CardTitle>
                                                <CardDescription>
                                                    {event.formatoTorneo || tournament.tipoTorneo} - {event.tipoDeJuego} {event.sexo}
                                                </CardDescription>
                                            </div>
                                            <Button size="sm" onClick={() => handleGenerateBracket(event)} disabled={isGenerating || isGenerated}>
                                                {isGenerating ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    isGenerated ? 'Bracket Generado' : 'Generar Bracket'
                                                )}
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Jugador</TableHead>
                                                        <TableHead>ELO</TableHead>
                                                        <TableHead className="hidden md:table-cell">Fecha de Inscripción</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {eventParticipants.length > 0 ? (
                                                        eventParticipants.map(inscription => {
                                                            const player = inscription.playerDetails;
                                                            return (
                                                            <TableRow key={inscription.id}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="w-8 h-8">
                                                                            <AvatarImage src={player?.avatar} alt={inscription?.displayName} />
                                                                            <AvatarFallback>{player?.firstName?.substring(0,1)}{player?.lastName?.substring(0,1)}</AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="font-medium">{inscription.displayName || 'Desconocido'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>{player?.rankPoints}</TableCell>
                                                                <TableCell className="hidden md:table-cell">{new Date(inscription.fechaInscripcion).toLocaleDateString()}</TableCell>
                                                            </TableRow>
                                                            )
                                                        })
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center h-24">
                                                                No hay jugadores inscritos en esta categoría.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            )
                        })}
                    </Tabs>
                 ) : (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            Este torneo no tiene categorías configuradas.
                        </CardContent>
                    </Card>
                 )}
            </div>
        </div>
    </>
  )
}
