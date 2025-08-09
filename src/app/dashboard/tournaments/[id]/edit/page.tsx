
"use client";

import { use, useEffect, useState } from "react";
import type { Player, Tournament, TournamentEvent, Inscription } from "@/types";
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
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function EditTournamentPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: inscriptions, loading: loadingInscriptions } = useCollection<Inscription>(`tournaments/${resolvedParams.id}/inscriptions`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

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
      .map(i => ({
        ...i,
        playerDetails: getPlayerDetails(i.jugadorId!)
      }));
  }

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
                {events.map(event => {
                    const eventParticipants = getEventInscriptions(event.id!);
                    return (
                        <Card key={event.id}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{event.nombre}</CardTitle>
                                    <CardDescription>
                                        {event.formatoTorneo || tournament.tipoTorneo} - {event.tipoDeJuego} {event.sexo}
                                    </CardDescription>
                                </div>
                                <Button size="sm" disabled>Generar Bracket</Button>
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
                                            eventParticipants.map(inscription => (
                                                <TableRow key={inscription.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage src={inscription.playerDetails?.avatar} alt={inscription.playerDetails?.displayName} />
                                                                <AvatarFallback>{inscription.playerDetails?.firstName?.substring(0,1)}{inscription.playerDetails?.lastName?.substring(0,1)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{inscription.playerDetails?.displayName || 'Desconocido'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{inscription.playerDetails?.rankPoints}</TableCell>
                                                    <TableCell className="hidden md:table-cell">{new Date(inscription.fechaInscripcion).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
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
                    )
                })}
                 {events.length === 0 && (
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
