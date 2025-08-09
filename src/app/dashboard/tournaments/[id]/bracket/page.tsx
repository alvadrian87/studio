
"use client";

import { useMemo, useState, useEffect, use } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button"
import Image from "next/image";
import Link from "next/link";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Loader2, Info, Swords, Settings } from "lucide-react"
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament, TournamentEvent, Inscription, Match } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function BracketPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const { data: inscriptions, loading: loadingInscriptions } = useCollection<Inscription>(`tournaments/${resolvedParams.id}/inscriptions`);
  const { data: matches, loading: loadingMatches } = useCollection<Match>(`matches`);
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const { user, userRole } = useAuth();
  const { toast } = useToast();

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
  
  const getEventMatches = (eventId: string) => {
    if (!matches || !tournament) return [];
    return matches.filter(m => m.tournamentId === tournament.id);
  }

  const isUserEnrolledInEvent = (eventId: string) => {
    if (!user || !inscriptions) return false;
    return inscriptions.some(i => i.eventoId === eventId && i.jugadorId === user.uid);
  }

  const handleEnroll = async (eventId: string) => {
    if (!user || !tournament) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para inscribirte.' });
        return;
    }
    
    try {
        await addDoc(collection(db, `tournaments/${tournament.id}/inscriptions`), {
            torneoId: tournament.id,
            eventoId: eventId,
            jugadorId: user.uid,
            fechaInscripcion: new Date().toISOString(),
            status: 'Confirmado',
        });
        
        toast({ title: '¡Inscripción Exitosa!', description: 'Te has inscrito correctamente en la categoría.'});
    } catch (error) {
        console.error("Error al inscribirse:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la inscripción.' });
    }
  };


  if (loadingTournament || loadingAllPlayers || loadingEvents || loadingInscriptions || loadingMatches) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando datos del torneo...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  const canManage = userRole === 'admin' || tournament.creatorId === user?.uid;

  return (
    <>
      <div className="relative mb-6">
        <Image
            src={tournament.imagenBannerUrl || "https://placehold.co/1200x400.png"}
            alt={tournament.nombreTorneo}
            data-ai-hint="tournament banner"
            width={1200}
            height={400}
            className="w-full h-48 md:h-64 object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg" />
        <div className="absolute top-4 right-4">
            {canManage && (
                <Button asChild>
                    <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>
                        <Settings className="mr-2 h-4 w-4" /> Administrar
                    </Link>
                </Button>
            )}
        </div>
        <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{tournament.nombreTorneo}</h1>
            <p className="text-lg text-white/90">{tournament.descripcion || 'Visualiza los participantes y el cuadro del torneo.'}</p>
        </div>
      </div>
      
       {events.length === 0 && !loadingEvents ? (
         <Card>
            <CardHeader>
                <CardTitle>Sin Categorías</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Este torneo aún no tiene categorías o divisiones configuradas.</p>
            </CardContent>
        </Card>
       ) : (
        <Tabs defaultValue={events[0].id}>
             <TabsList>
                 {events.map((event) => (
                    <TabsTrigger key={event.id} value={event.id!}>{event.nombre}</TabsTrigger>
                ))}
            </TabsList>
            {events.map((event) => {
                const eventParticipants = getEventInscriptions(event.id!);
                const eventMatches = getEventMatches(event.id!)
                const enrolled = isUserEnrolledInEvent(event.id!);
                
                return (
                    <TabsContent key={event.id} value={event.id!}>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{event.nombre}</CardTitle>
                                    <CardDescription>
                                        {event.formatoTorneo} - {event.tipoDeJuego} {event.sexo}
                                    </CardDescription>
                                </div>
                                {user && !enrolled && event.status !== 'En Curso' && (
                                    <Button onClick={() => handleEnroll(event.id!)}><UserPlus className="mr-2 h-4 w-4" /> Inscribirse</Button>
                                )}
                                {user && enrolled && (
                                    <Button variant="outline" disabled>Inscrito</Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {event.status === 'En Curso' ? (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Partidos (Draw)</h3>
                                        <div className="border rounded-lg">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Jugador 1</TableHead>
                                                        <TableHead className="w-[50px] text-center"></TableHead>
                                                        <TableHead>Jugador 2</TableHead>
                                                        <TableHead className="text-right">Estado</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {eventMatches.map(match => {
                                                        const player1 = getPlayerDetails(match.player1Id);
                                                        const player2 = getPlayerDetails(match.player2Id);
                                                        return (
                                                            <TableRow key={match.id}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="w-8 h-8"><AvatarImage src={player1?.avatar}/><AvatarFallback>{player1?.firstName?.substring(0,1)}{player1?.lastName?.substring(0,1)}</AvatarFallback></Avatar>
                                                                        {player1?.displayName}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center font-bold"><Swords className="h-5 w-5 mx-auto text-muted-foreground"/></TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="w-8 h-8"><AvatarImage src={player2?.avatar}/><AvatarFallback>{player2?.firstName?.substring(0,1)}{player2?.lastName?.substring(0,1)}</AvatarFallback></Avatar>
                                                                        {player2?.displayName}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">{match.status}</TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Alert className="mb-4">
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Inscripciones Abiertas</AlertTitle>
                                            <AlertDescription>
                                            La generación del cuadro y el emparejamiento de partidas se realizará una vez que se cierren las inscripciones.
                                            </AlertDescription>
                                        </Alert>
                                        <h3 className="text-lg font-semibold mb-4">Jugadores Inscritos</h3>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Jugador</TableHead>
                                                    <TableHead className="hidden md:table-cell">ELO</TableHead>
                                                    <TableHead className="hidden md:table-cell">Club</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {eventParticipants.length > 0 ? (
                                                eventParticipants.map((inscription) => (
                                                    <TableRow key={inscription.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={inscription.playerDetails?.avatar} alt={inscription.playerDetails?.displayName} />
                                                                <AvatarFallback>{inscription.playerDetails?.firstName?.substring(0,1)}{inscription.playerDetails?.lastName?.substring(0,1)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{inscription.playerDetails?.displayName || 'Desconocido'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{inscription.playerDetails?.rankPoints || 'N/A'}</TableCell>
                                                    <TableCell className="hidden md:table-cell">{inscription.playerDetails?.club || 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))
                                                ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">
                                                    Aún no hay jugadores inscritos en esta categoría. ¡Sé el primero!
                                                    </TableCell>
                                                </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )
            })}
        </Tabs>
       )}
    </>
  )
}

    