
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Swords, UserPlus, DoorOpen, Play, Trophy, Loader2, Info, Lock, Settings, ShieldQuestion } from "lucide-react"
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament, TournamentEvent, Inscription, Challenge, Invitation } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, add } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";


export default function LadderPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const { data: allChallenges, loading: loadingAllChallenges } = useCollection<Challenge>('challenges');
  const { data: inscriptions, loading: loadingInscriptions } = useCollection<Inscription>(`tournaments/${resolvedParams.id}/inscriptions`);
  const { data: invitations, loading: loadingInvitations } = useCollection<Invitation>('invitations');
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [challengingPlayerId, setChallengingPlayerId] = useState<string | null>(null);

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [selectedEventForDoubles, setSelectedEventForDoubles] = useState<TournamentEvent | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Player | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const filteredPartners = useMemo(() => {
    if (!allPlayers || searchQuery.length < 3) {
      return [];
    }
    return allPlayers.filter(p =>
      p.uid !== user?.uid &&
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allPlayers, searchQuery, user]);

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

  const getPlayerDetails = (playerId: string | undefined) => {
    if (!playerId) return null;
    return allPlayers?.find(p => p.uid === playerId);
  };
  
  const getEventInscriptions = (eventId: string) => {
    if (!inscriptions) return [];
    const eventInscriptions = inscriptions
      .filter(i => i.eventoId === eventId)
      .map(i => {
        const players = i.jugadoresIds.map(getPlayerDetails).filter(Boolean) as Player[];
        const displayName = players.map(p => p.displayName).join(' / ');
        const playerDetails = players.length === 1 ? players[0] : null;
        const avatar = players.length === 1 ? players[0].avatar : undefined;
        const fallback = players.map(p => p.firstName?.substring(0,1)).join('');

        return { ...i, players, displayName, playerDetails, avatar, fallback };
      })
      .sort((a, b) => a.posicionActual - b.posicionActual);
    return eventInscriptions;
  }

  const isUserEnrolledInEvent = (eventId: string) => {
    if (!user || !inscriptions) return false;
    return inscriptions.some(i => i.eventoId === eventId && (i.jugadoresIds.includes(user.uid)));
  }
  
  const userInscription = (eventId: string) => {
      if (!user || !inscriptions) return null;
      return inscriptions.find(i => i.eventoId === eventId && i.jugadoresIds.includes(user.uid));
  }

  const handleEnroll = async (event: TournamentEvent) => {
    if (!user || !tournament) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para inscribirte.' });
        return;
    }

    if (event.tipoDeJuego === 'Dobles') {
        setSelectedEventForDoubles(event);
        setIsPartnerModalOpen(true);
        return;
    }

    const eventInscriptions = getEventInscriptions(event.id!);
    const newPosition = eventInscriptions.length + 1;
    
    try {
        await addDoc(collection(db, `tournaments/${tournament.id}/inscriptions`), {
            torneoId: tournament.id,
            eventoId: event.id,
            jugadorId: user.uid, // Still useful for quick lookups
            jugadoresIds: [user.uid],
            fechaInscripcion: new Date().toISOString(),
            status: 'Confirmado',
            posicionInicial: newPosition,
            posicionActual: newPosition,
            indiceActividad: 0,
            desafioPendienteId: null
        });
        
        toast({ title: '¡Inscripción Exitosa!', description: 'Te has inscrito correctamente en la categoría.'});
    } catch (error) {
        console.error("Error al inscribirse:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la inscripción.' });
    }
  };

  const handleSendInvitation = async () => {
    if (!user || !selectedPartner || !selectedEventForDoubles || !tournament) return;
    setIsSendingInvite(true);

    const existingInvitation = invitations?.find(inv => 
      inv.eventoId === selectedEventForDoubles.id &&
      ((inv.invitadorId === user.uid && inv.invitadoId === selectedPartner.uid) || 
       (inv.invitadorId === selectedPartner.uid && inv.invitadoId === user.uid)) &&
      inv.estado === 'pendiente'
    );

    if (existingInvitation) {
        toast({ variant: "destructive", title: "Invitación ya existe", description: "Ya tienes una invitación pendiente con este jugador para este evento." });
        setIsSendingInvite(false);
        return;
    }

    try {
      await addDoc(collection(db, 'invitations'), {
        torneoId: tournament.id,
        eventoId: selectedEventForDoubles.id,
        invitadorId: user.uid,
        invitadoId: selectedPartner.uid,
        estado: 'pendiente',
        fechaCreacion: new Date().toISOString(),
        nombreTorneo: tournament.nombreTorneo,
        nombreEvento: selectedEventForDoubles.nombre
      });
      toast({ title: '¡Invitación Enviada!', description: `Se ha enviado una invitación a ${selectedPartner.displayName}.` });
      setIsPartnerModalOpen(false);
      setSelectedPartner(null);
    } catch (error) {
      console.error("Error al enviar invitación:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la invitación.' });
    } finally {
      setIsSendingInvite(false);
    }
  }

  const hasPendingChallenge = (challengerInscription: Inscription | null | undefined, eventId: string) => {
      if (!challengerInscription || !allChallenges) return false;
      
      return allChallenges.some(c => 
        c.eventoId === eventId &&
        (c.retadorId === challengerInscription.id || c.desafiadoId === challengerInscription.id) && 
        (c.estado === 'Pendiente' || c.estado === 'Aceptado')
    );
  }

  const canChallenge = (challengerInscription: Inscription | null | undefined, challengedInscription: Inscription) => {
    if (!challengerInscription || !tournament?.reglasLadder || !inscriptions) return false;

    // A player cannot challenge if they already have a pending challenge in this event
    if (hasPendingChallenge(challengerInscription, challengedInscription.eventoId)) return false;

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

    if (challengerPos === lastPosition) {
        return challengerPos - challengedPos <= posicionesDesafioArribaUltimoPuesto;
    }
    if (challengedPos === 1) {
        return challengerPos <= posicionesDesafioAbajoPrimerPuesto + 1;
    }

    return challengerPos - challengedPos <= posicionesDesafioArriba;
  };

  const handleChallenge = async (challengedInscription: Inscription) => {
    if (!user || !inscriptions || !tournament) return;
    setChallengingPlayerId(challengedInscription.id);

    const challengerInscription = userInscription(challengedInscription.eventoId);
    if (!challengerInscription) {
        toast({ variant: 'destructive', title: 'Error', description: 'No estás inscrito en esta categoría.' });
        setChallengingPlayerId(null);
        return;
    }

    try {
        const challengeCollectionRef = collection(db, "challenges");
        const newChallengeDoc: Omit<Challenge, 'id'> = {
            torneoId: tournament.id,
            eventoId: challengedInscription.eventoId,
            retadorId: challengerInscription.id, // Inscription ID
            desafiadoId: challengedInscription.id, // Inscription ID
            fechaDesafio: new Date().toISOString(),
            fechaLimiteAceptacion: add(new Date(), { hours: tournament?.tiempos?.tiempoLimiteAceptarDesafio || 48 }).toISOString(),
            estado: 'Pendiente',
            tournamentName: tournament.nombreTorneo, // Denormalized for easier display
        };

        await addDoc(challengeCollectionRef, newChallengeDoc);
        
        const challengedPlayers = (getEventInscriptions(challengedInscription.eventoId).find(i => i.id === challengedInscription.id))?.displayName
        toast({ title: '¡Desafío Enviado!', description: `Has desafiado a ${challengedPlayers}.` });
    } catch (error) {
        console.error("Error al crear el desafío: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el desafío.' });
    } finally {
        setChallengingPlayerId(null);
    }
  }


  if (loadingTournament || loadingAllPlayers || loadingEvents || loadingAllChallenges || loadingInscriptions || loadingInvitations) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando datos del torneo...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  const isLadderTournament = tournament.tipoTorneo === 'Evento tipo Escalera';
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
         <Tabs defaultValue={events[0].id}>
            <TabsList>
                 {events.map((event) => (
                    <TabsTrigger key={event.id} value={event.id!}>{event.nombre}</TabsTrigger>
                ))}
            </TabsList>
             {events.map((event) => {
                const eventParticipants = getEventInscriptions(event.id!);
                const enrolled = isUserEnrolledInEvent(event.id!);
                const currentUserInscription = userInscription(event.id!);
                const userHasPendingChallenge = hasPendingChallenge(currentUserInscription, event.id!);

                return (
                    <TabsContent key={event.id} value={event.id!}>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>{event.nombre}</CardTitle>
                                    <CardDescription>
                                        {event.tipoDeJuego} {event.sexo}
                                    </CardDescription>
                                </div>
                                {user && !enrolled && (
                                    <Button onClick={() => handleEnroll(event)}><UserPlus className="mr-2 h-4 w-4" /> Inscribirse</Button>
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
                                            {userHasPendingChallenge && <p className="font-semibold text-destructive mt-2">Tienes un desafío pendiente. No puedes desafiar a otros hasta que se resuelva.</p>}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">Pos.</TableHead>
                                            <TableHead>Jugador / Pareja</TableHead>
                                            <TableHead className="hidden md:table-cell">ELO</TableHead>
                                            <TableHead className="text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {eventParticipants.length > 0 ? (
                                        eventParticipants.map((inscription) => {
                                            const isSelf = inscription.jugadoresIds.includes(user?.uid || '');
                                            const isChallengable = canChallenge(currentUserInscription, inscription);
                                            const isChallenging = challengingPlayerId === inscription.id;
                                            
                                            const activeChallenge = allChallenges?.find(c => 
                                                c.eventoId === event.id &&
                                                (c.retadorId === inscription.id || c.desafiadoId === inscription.id) &&
                                                (c.estado === 'Pendiente' || c.estado === 'Aceptado')
                                            );
                                            
                                            const getOpponentName = () => {
                                                if (!activeChallenge) return '';
                                                const opponentInscriptionId = activeChallenge.retadorId === inscription.id ? activeChallenge.desafiadoId : activeChallenge.retadorId;
                                                const opponentInscription = eventParticipants.find(i => i.id === opponentInscriptionId);
                                                return opponentInscription?.displayName || 'Desconocido';
                                            }


                                            return (
                                            <TableRow key={inscription.id}>
                                            <TableCell className="font-bold text-lg">{inscription.posicionActual}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={inscription.avatar} alt={inscription.displayName} />
                                                        <AvatarFallback>{inscription.fallback}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{inscription.displayName || 'Desconocido'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{inscription.playerDetails?.rankPoints || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                {isLadderTournament && !isSelf && enrolled && (
                                                   activeChallenge ? (
                                                        <Badge variant={activeChallenge.estado === 'Aceptado' ? 'default' : 'secondary'}>
                                                          <ShieldQuestion className="mr-2 h-4 w-4"/>
                                                            {activeChallenge.estado === 'Pendiente' && (
                                                                activeChallenge.retadorId === inscription.id 
                                                                    ? `Desafiaste a ${getOpponentName()}` 
                                                                    : `Desafiado por ${getOpponentName()}`
                                                            )}
                                                            {activeChallenge.estado === 'Aceptado' && (
                                                                `Partida pendiente vs ${getOpponentName()}`
                                                            )}
                                                        </Badge>
                                                   ) : isChallengable ? (
                                                        <Button 
                                                            size="sm"
                                                            disabled={isChallenging || userHasPendingChallenge}
                                                            onClick={() => handleChallenge(inscription)}
                                                        >
                                                            {isChallenging ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                            ) : (
                                                                <Swords className="mr-2 h-4 w-4"/>
                                                            )}
                                                            Desafiar
                                                        </Button>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            <Lock className="mr-2 h-3 w-3"/>
                                                            Bloqueado
                                                        </Badge>
                                                    )
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
                    </TabsContent>
                )
             })}
         </Tabs>
       )}
       <Dialog open={isPartnerModalOpen} onOpenChange={setIsPartnerModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Seleccionar Compañero</DialogTitle>
            <DialogDescription>
              Busca y selecciona un jugador para enviarle una invitación de pareja para el evento de dobles.
            </DialogDescription>
          </DialogHeader>
            <Command>
              <CommandInput 
                placeholder="Buscar jugador (mín. 3 letras)..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>{searchQuery.length < 3 ? "Escribe al menos 3 letras para buscar." : "No se encontraron jugadores."}</CommandEmpty>
                <ScrollArea className="h-48">
                <CommandGroup>
                  {filteredPartners.map((partner) => (
                    <CommandItem
                      key={partner.uid}
                      value={partner.displayName}
                      onSelect={() => {
                        setSelectedPartner(partner);
                      }}
                       className={selectedPartner?.uid === partner.uid ? 'bg-accent' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={partner.avatar} alt={partner.displayName}/>
                            <AvatarFallback>{partner.firstName?.substring(0,1)}{partner.lastName?.substring(0,1)}</AvatarFallback>
                        </Avatar>
                        {partner.displayName}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsPartnerModalOpen(false); setSelectedPartner(null); }}>Cancelar</Button>
            <Button onClick={handleSendInvitation} disabled={!selectedPartner || isSendingInvite}>
              {isSendingInvite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
