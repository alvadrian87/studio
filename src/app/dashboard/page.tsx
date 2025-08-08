
"use client";

import { useMemo } from "react";
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
import { BarChart, Check, Clock, Swords, Trophy, X, ShieldQuestion } from "lucide-react"
import { useAuth } from "@/hooks/use-auth";
import type { Player, Match, Challenge } from "@/hooks/use-firestore";
import { useCollection, useDocument } from "@/hooks/use-firestore";


export default function Dashboard() {
  const { user } = useAuth();
  // Fetch the current user's player data from the 'users' collection
  const { data: player, loading: loadingPlayer } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  const { data: matches, loading: loadingMatches } = useCollection<Match>('matches');
  const { data: allChallenges, loading: loadingChallenges } = useCollection<Challenge>('challenges');
  
  const pendingChallenges = useMemo(() => {
    if (!allChallenges || !user) return [];
    return allChallenges.filter(c => c.challengedId === user.uid && c.status === 'Pendiente');
  }, [allChallenges, user]);

  if (loadingPlayer || loadingMatches || loadingChallenges) {
    return <div>Cargando...</div>
  }
  
  if (!player) {
    // This can happen if the user doc hasn't been created yet.
    // You might want to show a different message or guide them.
    return <div>No se encontraron datos del jugador.</div>
  }

  const totalGames = player.globalWins + player.globalLosses;

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido de nuevo, {player.displayName || 'Jugador'}!</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clasificación Global</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#1</div>
            <p className="text-xs text-muted-foreground">Pendiente de implementación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Victorias</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{player.globalWins}</div>
            <p className="text-xs text-muted-foreground">Totales en todos los torneos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Derrotas</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{player.globalLosses}</div>
            <p className="text-xs text-muted-foreground">Tu historial de rendimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Victorias</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalGames > 0 ? ((player.globalWins / totalGames) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Rendimiento general</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Partidas Recientes</CardTitle>
            <CardDescription>Un resumen de tus últimas partidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oponente</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Matches need to be fetched and filtered for the current user */}
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay partidas recientes.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Desafíos Activos</CardTitle>
            <CardDescription>Desafíos que esperan tu acción.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingChallenges.length > 0 ? (
              <ul className="space-y-4">
                {pendingChallenges.map(challenge => (
                  <li key={challenge.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{challenge.challengerName}</p>
                      <p className="text-sm text-muted-foreground">Te ha desafiado en: <span className="font-semibold text-primary">{challenge.tournamentName}</span></p>
                    </div>
                    <div className="flex gap-2">
                       <Button size="sm" variant="outline">Rechazar</Button>
                       <Button size="sm">Aceptar</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <ShieldQuestion className="h-10 w-10 mb-2" />
                <p>No tienes desafíos pendientes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
