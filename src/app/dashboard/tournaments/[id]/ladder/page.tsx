
"use client";

import { useMemo, useState, useEffect, use } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
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
import { Swords, UserPlus, DoorOpen, Play, Trophy, Loader2, Info } from "lucide-react"
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament, TournamentEvent, Inscription, Challenge } from "@/hooks/use-firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, add } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function LadderPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const { data: allChallenges, loading: loadingAllChallenges } = useCollection<Challenge>('challenges');
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loadingEventsAndData, setLoadingEventsAndData] = useState(true);
  const [challengingPlayerId, setChallengingPlayerId] = useState<string | null>(null);

  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (tournament) {
      const fetchEventsAndInscriptions = async () => {
        setLoadingEventsAndData(true);
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

        setLoadingEventsAndData(false);
      };
      fetchEventsAndInscriptions();
    }
  }, [tournament]);

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

  const isUserEnrolledInEvent = (eventId: string) => {
    if (!user) return false;
    return inscriptions.some(i => i.eventoId === eventId && i.jugadorId === user.uid);
  }
  
  const userInscription = (eventId: string) => {
      if (!user) return null;
      return inscriptions.find(i => i.eventoId === eventId && i.jugadorId === user.uid);
  }

  const handleEnroll = async (eventId: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para inscribirte.' });
        return;
    }
    const eventInscriptions = getEventInscriptions(eventId);
    const newPosition = eventInscriptions.length + 1;
    
    const batch = writeBatch(db);
    const newInscriptionRef = doc(collection(db, "inscriptions"));

    batch.set(newInscriptionRef, {
        torneoId: tournament!.id,
        eventoId: eventId,
        jugadorId: user.uid,
        fechaInscripcion: new Date().toISOString(),
        status: 'Confirmado',
        posicionInicial: newPosition,
        posicionActual: newPosition,
        indiceActividad: 0,
        desafioPendienteId: null
    });
    
    // Potentially update the tournament's inscription count
    // const tournamentRef = doc(db, "tournaments", tournament.id);
    // batch.update(tournamentRef, { ... });

    await batch.commit();
    toast({ title: '¡Inscripción Exitosa!', description: 'Te has inscrito correctamente en la categoría.'});
  };

  const canChallenge = (challengerInscription: Inscription | null | undefined, challengedInscription: Inscription) => {
    if (!challengerInscription || !tournament?.reglasLadder) return false;

    // A user cannot challenge someone if they already have a pending challenge
    const hasPendingChallenge = allChallenges?.some(c => 
        (c.retadorId === challengerInscription.jugadorId || c.desafiadoId === challengerInscription.jugadorId) && c.estado === 'Pendiente'
    );
    if (hasPendingChallenge) return false;

    const challengerPos = challengerInscription.posicionActual;
    const challengedPos = challengedInscription.posicionActual;

    if (challengerPos <= challengedPos) return false; // Cannot challenge someone below or at the same rank

    const {
        posicionesDesafioArriba,
        posicionesDesafioAbajoPrimerPuesto,
        posicionesDesafioArribaUltimoPuesto
    } = tournament.reglasLadder;

    const eventParticipants = getEventInscriptions(challengedInscription.eventoId);
    const lastPosition = eventParticipants.length;

    // Rule for the last position
    if (challengerPos === lastPosition) {
        return challengerPos - challengedPos <= posicionesDesafioArribaUltimoPuesto;
    }
    // Rule for the first position being challenged
    if (challengedPos === 1) {
        return challengerPos <= posicionesDesafioAbajoPrimerPuesto + 1;
    }

    // General rule
    return challengerPos - challengedPos <= posicionesDesafioArriba;
  };

  const handleChallenge = async (challengedInscription: Inscription) => {
    if (!user) return;
    setChallengingPlayerId(challengedInscription.jugadorId!);

    const challengerInscription = userInscription(challengedInscription.eventoId);
    if (!challengerInscription) {
        toast({ variant: 'destructive', title: 'Error', description: 'No estás inscrito en esta categoría.' });
        setChallengingPlayerId(null);
        return;
    }

    try {
        const challengeCollectionRef = collection(db, "challenges");
        const newChallengeDoc: Omit<Challenge, 'id'> = {
            torneoId: tournament!.id,
            eventoId: challengedInscription.eventoId,
            retadorId: challengerInscription.jugadorId!,
            desafiadoId: challengedInscription.jugadorId!,
            fechaDesafio: new Date().toISOString(),
            fechaLimiteAceptacion: add(new Date(), { hours: tournament?.tiempos?.tiempoLimiteAceptarDesafio || 48 }).toISOString(),
            estado: 'Pendiente',
            tournamentName: tournament!.nombreTorneo, // Denormalized for easier display
        };

        await addDoc(challengeCollectionRef, newChallengeDoc);

        toast({ title: '¡Desafío Enviado!', description: `Has desafiado a ${getPlayerDetails(challengedInscription.jugadorId!)?.displayName}.` });
    } catch (error) {
        console.error("Error al crear el desafío: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el desafío.' });
    } finally {
        setChallengingPlayerId(null);
    }
  }


  if (loadingTournament || loadingAllPlayers || loadingEventsAndData || loadingAllChallenges) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando datos del torneo...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  const isLadderTournament = tournament.tipoTorneo === 'Evento tipo Escalera';


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
      
       {events.length === 0 && !loadingEventsAndData ? (
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
           const enrolled = isUserEnrolledInEvent(event.id!);
           const currentUserInscription = userInscription(event.id!);

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
                            <Button onClick={() => handleEnroll(event.id!)}><UserPlus className="mr-2 h-4 w-4" /> Inscribirse</Button>
                         )}
                         {user && enrolled && (
                            <Button variant="outline" disabled><DoorOpen className="mr-2 h-4 w-4" /> Abandonar (Próximamente)</Button>
                         )}
                    </CardHeader>
                    <CardContent>
                        {isLadderTournament && (
                             <Alert className="mb-4">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Reglas de Desafío</AlertTitle>
                                <AlertDescription>
                                    Puedes desafiar a jugadores que estén hasta <span className="font-bold">{tournament.reglasLadder?.posicionesDesafioArriba}</span> posiciones por encima de ti. ¡Demuestra tu habilidad y sube en la clasificación!
                                </AlertDescription>
                            </Alert>
                        )}
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
                                  eventParticipants.map((inscription) => {
                                     const isSelf = user?.uid === inscription.jugadorId;
                                     const canBeChallenged = enrolled && !isSelf && canChallenge(currentUserInscription, inscription);
                                     const isChallenging = challengingPlayerId === inscription.jugadorId;

                                      return (
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
                                         {isLadderTournament && !isSelf && (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                disabled={!canBeChallenged || !!challengingPlayerId}
                                                onClick={() => handleChallenge(inscription)}
                                            >
                                                {isChallenging ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                ) : (
                                                    <Swords className="mr-2 h-4 w-4"/>
                                                )}
                                                Desafiar
                                            </Button>
                                         )}
                                      </TableCell>
                                    </TableRow>
                                  )})
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

    