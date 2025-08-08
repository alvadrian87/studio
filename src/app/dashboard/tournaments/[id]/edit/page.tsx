
"use client";

// import { TournamentForm } from "@/components/tournament-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDocument } from "@/hooks/use-firestore";
import type { Tournament } from "@/hooks/use-firestore";
import { use } from "react";

export default function EditTournamentPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: tournament, loading } = useDocument<Tournament>(`tournaments/${id}`);

  if (loading) {
    return <div>Cargando detalles del torneo...</div>;
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>;
  }
  
  // The new TournamentForm is for creation only for now. 
  // Editing a complex tournament with events requires a different logic flow.
  // We will show a placeholder message for now.

  return (
    <>
        <div className="flex items-center justify-between space-y-2">
            <div className="flex flex-col w-full">
                <h1 className="text-3xl font-bold tracking-tight">Editar Torneo</h1>
                <p className="text-muted-foreground">La edición de torneos se implementará en una futura actualización.</p>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Función en Desarrollo</CardTitle>
                <CardDescription>El nuevo wizard de creación es el primer paso. La edición de estos nuevos y complejos torneos vendrá pronto.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Torneo: {tournament.nombreTorneo}</p>
            </CardContent>
        </Card>
    </>
  )
}

    