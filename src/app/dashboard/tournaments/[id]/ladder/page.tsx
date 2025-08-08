"use client";

import { useMemo, useState } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Swords, UserPlus, DoorOpen } from "lucide-react"
import { useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament } from "@/hooks/use-firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function LadderPage({ params }: { params: { id: string } }) {
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${params.id}`);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const { user } = useAuth();
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
        // Firestore 'in' query is limited to 30 elements. For more participants, pagination or a different approach would be needed.
        const q = query(usersRef, where('uid', 'in', tournament.participants.slice(0, 30)));
        const querySnapshot = await getDocs(q);
        const participantData: Player[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            participantData.push({
                id: doc.id,
                displayName: data.displayName,
                email: data.email,
                globalWins: data.globalWins || 0,
                globalLosses: data.globalLosses || 0,
            } as Player);
        });
        setParticipants(participantData);
      } catch (error) {
        console.error("Error fetching participants:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los participantes." });
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchParticipants();
  }, [tournament, toast]);
  

  const isEnrolled = useMemo(() => {
    if (!user || !tournament) return false;
    return tournament.participants.includes(user.uid);
  }, [user, tournament]);

  const canEnroll = useMemo(() => {
    if (!tournament) return false;
    return tournament.status === 'Próximo' && tournament.participants.length < tournament.numberOfPlayers;
  }, [tournament]);


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


  if (loadingTournament) {
    return <div>Cargando...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-bold tracking-tight">Clasificación de {tournament.name}</h1>
            <p className="text-muted-foreground">Clasificación de jugadores y estado de los desafíos.</p>
        </div>
         <div className="ml-auto flex items-center gap-2">
            {canEnroll && !isEnrolled && (
                <Button onClick={() => handleEnrollment(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Inscribirse
                </Button>
            )}
            {isEnrolled && tournament.status === 'Próximo' &&(
                 <Button variant="outline" onClick={() => handleEnrollment(false)}>
                    <DoorOpen className="mr-2 h-4 w-4" /> Abandonar
                </Button>
            )}
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Jugadores Inscritos ({participants.length}/{tournament.numberOfPlayers})</CardTitle>
          <CardDescription>La lista oficial de jugadores para el {tournament.name}. El ranking se generará cuando comience el torneo.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingParticipants ? (
            <p>Cargando participantes...</p>
          ) : participants.length > 0 ? (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead className="hidden md:table-cell">Victorias Globales</TableHead>
                    <TableHead className="hidden md:table-cell">Derrotas Globales</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {participants.map((player) => (
                    <TableRow key={player.id}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={player.avatar} alt={player.displayName} />
                            <AvatarFallback>{player.displayName?.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{player.displayName}</span>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-green-500 font-medium">{player.globalWins}</TableCell>
                    <TableCell className="hidden md:table-cell text-red-500 font-medium">{player.globalLosses}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" disabled={tournament.status !== 'En Curso' || player.id === user?.uid}>
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
                <p className="text-sm">¡Sé el primero en unirte!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
