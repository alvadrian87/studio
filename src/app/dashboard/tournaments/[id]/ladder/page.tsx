"use client";

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
import { Swords } from "lucide-react"
import { useCollection, useDocument } from "@/hooks/use-firestore";
import type { Player, Tournament } from "@/hooks/use-firestore";

export default function LadderPage({ params }: { params: { id: string } }) {
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${params.id}`);
  const { data: players, loading: loadingPlayers } = useCollection<Player>('players');

  if (loadingTournament || loadingPlayers) {
    return <div>Cargando...</div>
  }

  if (!tournament) {
    return <div>Torneo no encontrado.</div>
  }

  const sortedPlayers = players?.sort((a, b) => a.rank - b.rank);

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-bold tracking-tight">Clasificación de {tournament.name}</h1>
            <p className="text-muted-foreground">Clasificación de jugadores y estado de los desafíos.</p>
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Clasificación de Jugadores</CardTitle>
          <CardDescription>La clasificación oficial para el {tournament.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rango</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="hidden md:table-cell">Victorias</TableHead>
                <TableHead className="hidden md:table-cell">Derrotas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers?.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-bold text-lg text-muted-foreground">#{player.rank}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{player.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-green-500 font-medium">{player.wins}</TableCell>
                  <TableCell className="hidden md:table-cell text-red-500 font-medium">{player.losses}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled={player.rank === 1}>
                        <Swords className="h-4 w-4 mr-2" />
                        Desafiar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
