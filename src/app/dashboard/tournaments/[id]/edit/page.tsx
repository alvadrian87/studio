
"use client";

import { use, useEffect, useState } from "react";
import type { Tournament, TournamentEvent } from "@/types";
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

export default function EditTournamentPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
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

  if (loadingTournament || loadingEvents) {
    return <div>Cargando detalles del torneo...</div>;
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>;
  }

  return (
    <>
        <div className="flex items-center justify-between space-y-2">
            <div className="flex flex-col w-full">
                <h1 className="text-3xl font-bold tracking-tight">Editar Torneo</h1>
                <p className="text-muted-foreground">Revisa los detalles y categorías de tu torneo.</p>
            </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>Detalles principales del torneo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                        <p>{tournament.nombreTorneo}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                        <p><Badge>{tournament.tipoTorneo}</Badge></p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Fechas</p>
                        <p>{new Date(tournament.fechaInicio).toLocaleDateString()} - {new Date(tournament.fechaFin).toLocaleDateString()}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                        <p>{tournament.ubicacion}</p>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Configuración</CardTitle>
                    <CardDescription>Reglas y estado actual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Estado</p>
                        <p><Badge variant={tournament.status === 'En Curso' ? 'default' : 'secondary'}>{tournament.status}</Badge></p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Ranking</p>
                        <p>{tournament.isRanked ? "Sí, afecta ELO" : "No, es amistoso"}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Categorías / Divisiones</CardTitle>
                <CardDescription>Lista de todos los eventos configurados para este torneo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Sexo</TableHead>
                            <TableHead className="text-right">Tarifa ($)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.length > 0 ? (
                            events.map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell className="font-medium">{event.nombre}</TableCell>
                                    <TableCell>{event.tipoDeJuego || 'N/A'}</TableCell>
                                    <TableCell>{event.sexo || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{event.tarifaInscripcion || 0}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">No se encontraron categorías.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </>
  )
}
