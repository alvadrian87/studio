

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
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament, TournamentEvent } from "@/hooks/use-firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { format } from "date-fns";

export default function LadderPage({ params }: { params: { id: string } }) {
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${params.id}`);
  // TODO: Adapt this page to fetch participants from the new 'inscriptions' collection
  const [participants, setParticipants] = useState<Player[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const isEnrolled = false; // Placeholder
  const canEnroll = false; // Placeholder

  const canManageTournament = useMemo(() => {
    if (!user || !userRole || !tournament) return false;
    return userRole === 'admin' || tournament.creatorId === user.uid;
  }, [user, userRole, tournament]);


  if (loadingTournament) {
    return <div>Cargando...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  // NOTE: This page is now partially broken due to the data model changes.
  // It needs to be updated to fetch events and then inscriptions for those events.
  // This is a placeholder to prevent the app from crashing.

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
            <p className="text-lg text-muted-foreground text-white/90">Clasificación de jugadores y estado de los desafíos.</p>
        </div>
      </div>
      <div className="flex items-center justify-between space-y-2 mb-6">
         <div className="flex items-center gap-2">
            {canEnroll && !isEnrolled && (
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Inscribirse
                </Button>
            )}
            {isEnrolled && tournament.status === 'Próximo' && (
                 <Button variant="outline">
                    <DoorOpen className="mr-2 h-4 w-4" /> Abandonar
                </Button>
            )}
            {canManageTournament && tournament.status === 'Próximo' && (
                <Button disabled={participants.length < 2}>
                    <Play className="mr-2 h-4 w-4" /> Iniciar Torneo
                </Button>
            )}
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Jugadores Inscritos</CardTitle>
          <CardDescription>
             Esta sección se actualizará para mostrar los eventos y sus inscritos.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-8 text-muted-foreground">
                <p>La lógica de la clasificación se está adaptando al nuevo modelo de datos.</p>
            </div>
        </CardContent>
      </Card>
    </>
  )
}
