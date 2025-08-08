"use client";

import { TournamentForm } from "@/components/tournament-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDocument } from "@/hooks/use-firestore";
import type { Tournament } from "@/hooks/use-firestore";

export default function EditTournamentPage({ params }: { params: { id: string } }) {
  const { data: tournament, loading } = useDocument<Tournament>(`tournaments/${params.id}`);

  if (loading) {
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
                <p className="text-muted-foreground">Actualiza los detalles de tu torneo a continuación.</p>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Detalles del Torneo</CardTitle>
                <CardDescription>Usa nuestro asistente de IA para ayudarte a optimizar los ajustes.</CardDescription>
            </CardHeader>
            <CardContent>
                <TournamentForm tournament={tournament} />
            </CardContent>
        </Card>
    </>
  )
}
