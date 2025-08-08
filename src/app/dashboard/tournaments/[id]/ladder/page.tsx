

"use client";

import { useMemo, useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button"
import Image from "next/image";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Swords, UserPlus, DoorOpen, Play, Trophy, Loader2 } from "lucide-react"
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament, TournamentEvent, Inscription } from "@/hooks/use-firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function LadderPage({ params }: { params: { id: string } }) {
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${params.id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (tournament) {
      const fetchEventsAndInscriptions = async () => {
        setLoadingEvents(true);
        // Fetch Events (Categories/Divisions)
        const eventsQuery = query(collection(db, "eventos"), where("torneoId", "==", tournament.id));
        const eventsSnapshot = await getDocs(eventsQuery);
        const tournamentEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TournamentEvent));
        setEvents(tournamentEvents);

        // Fetch Inscriptions for the whole tournament
        const inscriptionsQuery = query(collection(db, "inscriptions"), where("torneoId", "==", tournament.id));
        const inscriptionsSnapshot = await getDocs(inscriptionsQuery);
        const tournamentInscriptions = inscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inscription));
        setInscriptions(tournamentInscriptions);

        setLoadingEvents(false);
      };
      fetchEventsAndInscriptions();
    }
  }, [tournament]);

  const canManageTournament = useMemo(() => {
    if (!user || !userRole || !tournament) return false;
    return userRole === 'admin' || tournament.creatorId === user.uid;
  }, [user, userRole, tournament]);

  const getPlayerDetails = (playerId: string) => {
    return allPlayers?.find(p => p.uid === playerId);
  };
  
  const getEventInscriptions = (eventId: string) => {
    return inscriptions
      .filter(i => i.eventoId === eventId)
      .map(i => ({
        ...i,
        playerDetails: getPlayerDetails(i.jugadorId!)
      }))
      .sort((a, b) => a.posicionActual - b.posicionActual);
  }

  const isUserEnrolled = (eventId: string) => {
    if (!user) return false;
    return inscriptions.some(i => i.eventoId === eventId && i.jugadorId === user.uid);
  }

  if (loadingTournament || loadingAllPlayers || loadingEvents) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando datos del torneo...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }


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
        <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{tournament.nombreTorneo}</h1>
            <p className="text-lg text-white/90">{tournament.descripcion || 'Clasificación de jugadores y estado de los desafíos.'}</p>
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
         events.map((event) => {
           const eventParticipants = getEventInscriptions(event.id!);
           const enrolled = isUserEnrolled(event.id!);

            return (
                <Card key={event.id} className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{event.nombre}</CardTitle>
                            <CardDescription>
                                {event.tipoDeJuego} {event.sexo}
                            </CardDescription>
                        </div>
                         {user && !enrolled && (
                            <Button disabled><UserPlus className="mr-2 h-4 w-4" /> Inscribirse</Button>
                         )}
                         {user && enrolled && (
                            <Button variant="outline" disabled><DoorOpen className="mr-2 h-4 w-4" /> Abandonar</Button>
                         )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Pos.</TableHead>
                                    <TableHead>Jugador</TableHead>
                                    <TableHead className="hidden md:table-cell">ELO</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {eventParticipants.length > 0 ? (
                                  eventParticipants.map((inscription) => (
                                     <TableRow key={inscription.id}>
                                      <TableCell className="font-bold text-lg">{inscription.posicionActual}</TableCell>
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
                                      <TableCell className="text-right">
                                         {user && user.uid !== inscription.jugadorId && (
                                            <Button variant="outline" size="sm" disabled><Swords className="mr-2 h-4 w-4"/>Desafiar</Button>
                                         )}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                      Aún no hay jugadores inscritos en esta categoría.
                                    </TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )
         })
       )}
    </>
  )
}
