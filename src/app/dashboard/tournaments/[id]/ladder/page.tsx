
"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, getDocs, collection, query, where, addDoc } from "firebase/firestore";
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
import { Swords, UserPlus, DoorOpen, Play, Trophy } from "lucide-react"
import { useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament } from "@/hooks/use-firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { format } from "date-fns";

export default function LadderPage({ params }: { params: { id: string } }) {
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${params.id}`);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!tournament || tournament.participants.length === 0) {
        setParticipants([]);
        setLoadingParticipants(false);
        return;
      }

      try {
        setLoadingParticipants(true);
        const usersRef = collection(db, "users");
        const participantChunks: string[][] = [];
        // Firestore 'in' query is limited to 30 elements, so we chunk the participants array.
        for (let i = 0; i < tournament.participants.length; i += 30) {
            participantChunks.push(tournament.participants.slice(i, i + 30));
        }

        const participantData: Player[] = [];
        for (const chunk of participantChunks) {
            const q = query(usersRef, where('uid', 'in', chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
                const data = doc.data();
                participantData.push({
                    id: doc.id,
                    uid: data.uid,
                    displayName: data.displayName,
                    email: data.email,
                    globalWins: data.globalWins || 0,
                    globalLosses: data.globalLosses || 0,
                    rankPoints: data.rankPoints || 1000,
                } as Player);
            });
        }
        
        // Sort participants by rankPoints
        participantData.sort((a, b) => b.rankPoints - a.rankPoints);
        
        setParticipants(participantData);
      } catch (error) {
        console.error("Error fetching participants:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los participantes." });
      } finally {
        setLoadingParticipants(false);
      }
    };

    if(!loadingTournament && tournament){
        fetchParticipants();
    }
  }, [tournament, loadingTournament, toast]);
  

  const isEnrolled = useMemo(() => {
    if (!user || !tournament) return false;
    return tournament.participants.includes(user.uid);
  }, [user, tournament]);

  const canEnroll = useMemo(() => {
    if (!tournament) return false;
    return tournament.status === 'Próximo' && tournament.participants.length < tournament.numberOfPlayers;
  }, [tournament]);

  const canManageTournament = useMemo(() => {
    if (!user || !userRole || !tournament) return false;
    return userRole === 'admin' || tournament.creatorId === user.uid;
  }, [user, userRole, tournament]);


  const handleEnrollment = async (enroll: boolean) => {
    if (!user || !tournament) return;

    const tournamentRef = doc(db, "tournaments", tournament.id);

    try {
      await updateDoc(tournamentRef, {
        participants: enroll ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
      toast({
        title: "¡Éxito!",
        description: `Has ${enroll ? 'entrado en' : 'salido de'} el torneo.`,
      });
    } catch (error) {
      console.error("Error al actualizar la inscripción:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar tu solicitud. Inténtalo de nuevo.",
      });
    }
  };
  
  const handleStartTournament = async () => {
    if (!tournament || !canManageTournament) return;
    
    if (participants.length < 2) {
      toast({
        variant: "destructive",
        title: "No se puede iniciar el torneo",
        description: "Se necesitan al menos 2 jugadores para iniciar el torneo.",
      });
      return;
    }

    const tournamentRef = doc(db, "tournaments", tournament.id);
    try {
      await updateDoc(tournamentRef, {
        status: "En Curso",
      });
      toast({
        title: "¡Torneo Iniciado!",
        description: "El torneo ha comenzado. ¡Que empiecen las partidas!",
      });
    } catch (error) {
      console.error("Error al iniciar el torneo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo iniciar el torneo. Inténtalo de nuevo.",
      });
    }
  };

  const handleChallenge = async (challengedPlayer: Player) => {
    if (!user || !user.displayName || !tournament) {
        toast({ variant: "destructive", title: "Error", description: "No se puede enviar el desafío. Falta información." });
        return;
    };

    try {
        await addDoc(collection(db, "challenges"), {
            challengerId: user.uid,
            challengerName: user.displayName,
            challengedId: challengedPlayer.uid,
            challengedName: challengedPlayer.displayName,
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            status: "Pendiente",
            date: format(new Date(), "yyyy-MM-dd HH:mm"),
        });

        toast({
            title: "¡Desafío Enviado!",
            description: `Has desafiado a ${challengedPlayer.displayName}.`,
        });

    } catch (error) {
        console.error("Error creating challenge:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo enviar el desafío. Inténtalo de nuevo.",
        });
    }
  };


  if (loadingTournament) {
    return <div>Cargando...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  return (
    <>
      <div className="relative mb-6">
        <Image
            src={tournament.bannerUrl || "https://placehold.co/1200x400.png"}
            alt={tournament.name}
            data-ai-hint="tournament banner"
            width={1200}
            height={400}
            className="w-full h-48 md:h-64 object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg" />
        <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{tournament.name}</h1>
            <p className="text-lg text-muted-foreground text-white/90">Clasificación de jugadores y estado de los desafíos.</p>
        </div>
      </div>
      <div className="flex items-center justify-between space-y-2 mb-6">
         <div className="flex items-center gap-2">
            {canEnroll && !isEnrolled && (
                <Button onClick={() => handleEnrollment(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Inscribirse
                </Button>
            )}
            {isEnrolled && tournament.status === 'Próximo' && (
                 <Button variant="outline" onClick={() => handleEnrollment(false)}>
                    <DoorOpen className="mr-2 h-4 w-4" /> Abandonar
                </Button>
            )}
            {canManageTournament && tournament.status === 'Próximo' && (
                <Button onClick={handleStartTournament} disabled={participants.length < 2}>
                    <Play className="mr-2 h-4 w-4" /> Iniciar Torneo
                </Button>
            )}
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Jugadores Inscritos ({participants.length}/{tournament.numberOfPlayers})</CardTitle>
          <CardDescription>
            {tournament.status === 'Próximo' 
              ? `La lista oficial de jugadores para el ${tournament.name}.`
              : `El torneo ${tournament.name} está ${tournament.isRanked ? 'en curso y es de ranking' : 'en curso'}.`
            }
            </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingParticipants ? (
            <p>Cargando participantes...</p>
          ) : participants.length > 0 ? (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Ranking</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="hidden md:table-cell">Puntos ELO</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {participants.map((player, index) => (
                    <TableRow key={player.id}>
                    <TableCell className="font-bold text-lg text-muted-foreground w-16">
                        <div className="flex items-center gap-2">
                           {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                           {index === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
                           {index === 2 && <Trophy className="w-5 h-5 text-orange-400" />}
                           {index > 2 && <span className="w-5 h-5 flex items-center justify-center">{index + 1}</span>}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={player.avatar} alt={player.displayName} />
                            <AvatarFallback>{player.displayName?.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{player.displayName}</span>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-medium">{player.rankPoints}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={tournament.status !== 'En Curso' || player.uid === user?.uid}
                            onClick={() => handleChallenge(player)}
                        >
                            <Swords className="h-4 w-4 mr-2" />
                            Desafiar
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
                <p>Aún no hay jugadores inscritos en este torneo.</p>
                {tournament.status === 'Próximo' && <p className="text-sm">¡Sé el primero en unirte!</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
