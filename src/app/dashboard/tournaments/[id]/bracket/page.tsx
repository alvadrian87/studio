
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Loader2, Info, Swords, Settings, Search, CheckCircle } from "lucide-react"
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament, TournamentEvent, Inscription, Match, Invitation } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


export default function BracketPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const { data: inscriptions, loading: loadingInscriptions } = useCollection<Inscription>(`tournaments/${resolvedParams.id}/inscriptions`);
  const { data: matches, loading: loadingMatches } = useCollection<Match>(`matches`);
  const { data: invitations, loading: loadingInvitations } = useCollection<Invitation>('invitations');
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

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

  const getInscriptionDetails = (inscriptionId: string | undefined | null): { inscription: Inscription | null, players: Player[], displayName: string, avatar?: string, fallback: string } => {
    if (!inscriptionId || !inscriptions || !allPlayers) {
        return { inscription: null, players: [], displayName: "Desconocido", fallback: "?" };
    }
    const inscription = inscriptions.find(i => i.id === inscriptionId) || null;
    if (!inscription) {
        return { inscription: null, players: [], displayName: "Desconocido", fallback: "?" };
    }

    const players = (inscription.jugadoresIds || []).map(pid => allPlayers.find(p => p.uid === pid)).filter(Boolean) as Player[];
    const displayName = players.map(p => p.displayName).join(' / ');
    const avatar = players.length === 1 ? players[0].avatar : undefined;
    const fallback = players.map(p => p.firstName?.substring(0, 1)).join('') || '?';

    return { inscription, players, displayName, avatar, fallback };
  };

  const getEventInscriptions = (eventId: string) => {
    if (!inscriptions) return [];
    return inscriptions
      .filter(i => i.eventoId === eventId)
      .map(i => {
        const { players, displayName, avatar, fallback } = getInscriptionDetails(i.id);
        const playerDetails = players.length === 1 ? players[0] : null;
        return { ...i, players, displayName, playerDetails, avatar, fallback };
      });
  }
  
  const getEventMatchesByRound = (eventId: string) => {
    if (!matches || !tournament) return {};
    const eventMatches = matches.filter(m => m.eventoId === eventId && m.tournamentId === tournament.id);
    const rounds: { [key: number]: Match[] } = {};
    
    eventMatches.forEach(match => {
        if (!rounds[match.roundNumber]) {
            rounds[match.roundNumber] = [];
        }
        rounds[match.roundNumber].push(match);
    });
    
    return rounds;
  }

  const getRoundName = (roundNumber: number, totalRounds: number) => {
    const roundsLeft = totalRounds - roundNumber + 1;
    if (roundsLeft === 1) return "Final";
    if (roundsLeft === 2) return "Semifinales";
    if (roundsLeft === 3) return "Cuartos de Final";
    if (roundsLeft === 4) return "Octavos de Final";
    return `Ronda ${roundNumber}`;
  }

  const isUserEnrolledInEvent = (eventId: string) => {
    if (!user || !inscriptions) return false;
    return inscriptions.some(i => i.eventoId === eventId && (Array.isArray(i.jugadoresIds) && i.jugadoresIds.includes(user.uid)));
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
    
    try {
        await addDoc(collection(db, `tournaments/${tournament.id}/inscriptions`), {
            torneoId: tournament.id,
            eventoId: event.id,
            jugadorId: user.uid, // Keep for backward compatibility / easy queries
            jugadoresIds: [user.uid],
            fechaInscripcion: new Date().toISOString(),
            status: 'Confirmado',
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


  if (loadingTournament || loadingAllPlayers || loadingEvents || loadingInscriptions || loadingMatches || loadingInvitations) {
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
        <Tabs defaultValue={events.length > 0 ? events[0].id : ''}>
             <TabsList>
                 {events.map((event) => (
                    <TabsTrigger key={event.id} value={event.id!}>{event.nombre}</TabsTrigger>
                ))}
            </TabsList>
            {events.map((event) => {
                const eventParticipants = getEventInscriptions(event.id!);
                const rounds = getEventMatchesByRound(event.id!);
                const totalRounds = Math.max(0, ...Object.keys(rounds).map(Number));
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
                                    <Button onClick={() => handleEnroll(event)}><UserPlus className="mr-2 h-4 w-4" /> Inscribirse</Button>
                                )}
                                {user && enrolled && (
                                    <Button variant="outline" disabled>Inscrito</Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {event.status === 'En Curso' ? (
                                    <div className="space-y-6">
                                        {Object.keys(rounds).sort().map(roundNumberStr => {
                                            const roundNumber = parseInt(roundNumberStr, 10);
                                            const roundMatches = rounds[roundNumber];
                                            return (
                                            <div key={roundNumber}>
                                                <h3 className="text-lg font-semibold mb-2">{getRoundName(roundNumber, totalRounds)}</h3>
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
                                                            {roundMatches.map(match => {
                                                                const p1 = getInscriptionDetails(match.player1Id);
                                                                const p2 = getInscriptionDetails(match.player2Id);
                                                                
                                                                return (
                                                                    <TableRow key={match.id}>
                                                                        <TableCell>
                                                                            <div className="flex items-center gap-3">
                                                                                <Avatar className="w-8 h-8"><AvatarImage src={p1?.avatar}/><AvatarFallback>{p1?.fallback}</AvatarFallback></Avatar>
                                                                                {p1?.displayName}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-bold">
                                                                           {match.isBye ? <CheckCircle className="h-5 w-5 mx-auto text-green-500"/> : <Swords className="h-5 w-5 mx-auto text-muted-foreground"/>}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                             {p2?.inscription ? (
                                                                                 <div className="flex items-center gap-3">
                                                                                    <Avatar className="w-8 h-8"><AvatarImage src={p2?.avatar}/><AvatarFallback>{p2?.fallback}</AvatarFallback></Avatar>
                                                                                    {p2?.displayName}
                                                                                </div>
                                                                             ) : match.isBye ? (
                                                                                <span className="text-muted-foreground italic">BYE</span>
                                                                             ) : "TBD"}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">{match.status}</TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                            )
                                        })}
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
                                                    <TableHead>Jugador/Pareja</TableHead>
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
                                                                <AvatarImage src={inscription.avatar} alt={inscription.displayName} />
                                                                <AvatarFallback>{inscription.fallback}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{inscription.displayName || 'Desconocido'}</span>
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
