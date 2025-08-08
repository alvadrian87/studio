"use client";

import Link from "next/link"
import { PlusCircle, MoreHorizontal } from "lucide-react"
import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCollection } from "@/hooks/use-firestore"
import type { Tournament } from "@/hooks/use-firestore"
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function TournamentsPage() {
  const { data: tournaments, loading } = useCollection<Tournament>('tournaments');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { userRole, user } = useAuth();
  
  const handleDeleteClick = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTournamentId) return;
    try {
      await deleteDoc(doc(db, "tournaments", selectedTournamentId));
      toast({
        title: "Torneo Eliminado",
        description: "El torneo ha sido eliminado exitosamente.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el torneo. Por favor, inténtalo de nuevo.",
      });
      console.error("Error al eliminar el torneo: ", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedTournamentId(null);
    }
  };


  if (loading) {
    return <div>Cargando torneos...</div>
  }

  const canManageTournament = (tournament: Tournament) => {
    {/* Admins can manage any tournament, creators can manage their own. */}
    return userRole === 'admin' || tournament.creatorId === user?.uid;
  }

  return (
    <>
      <div className="flex items-center">
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-bold tracking-tight">Torneos</h1>
            <p className="text-muted-foreground">Gestiona tus torneos y mira su estado.</p>
        </div>
        {userRole === 'admin' && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/dashboard/tournaments/new">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Crear Torneo
                </span>
              </Link>
            </Button>
          </div>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Torneos</CardTitle>
          <CardDescription>Una lista de todos los torneos en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Formato</TableHead>
                <TableHead className="hidden md:table-cell">Ubicación</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournaments?.map((tournament) => (
                <TableRow key={tournament.id}>
                  <TableCell className="font-medium">{tournament.name}</TableCell>
                  <TableCell>
                    <Badge variant={tournament.status === 'En Curso' ? 'default' : 'secondary'}>
                      {tournament.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{tournament.format}</TableCell>
                  <TableCell className="hidden md:table-cell">{tournament.location}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                         <DropdownMenuItem asChild>
                            <Link href={`/dashboard/tournaments/${tournament.id}/ladder`}>Ver Clasificación</Link>
                        </DropdownMenuItem>
                        {canManageTournament(tournament) && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/tournaments/${tournament.id}/edit`}>Editar</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(tournament.id)}>
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el torneo
              y todos sus datos asociados de nuestros servidores.
            </Description>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
