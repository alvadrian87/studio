
"use client";

import { use, useCallback } from "react";
import type { Player, Tournament, Match } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Swords } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";


export default function SchedulePage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, userRole } = useAuth();
  
  const { data: tournament, loading: loadingTournament } = useDocument<Tournament>(`tournaments/${resolvedParams.id}`);
  const { data: allPlayers, loading: loadingAllPlayers } = useCollection<Player>('users');
  const { data: matches, loading: loadingMatches } = useCollection<Match>('matches');
  
  const getPlayerById = useCallback((id: string | undefined | null) => {
    if (!id) return null;
    return allPlayers?.find(p => p.uid === id);
  }, [allPlayers]);
  
  const tournamentMatches = matches?.filter(m => m.tournamentId === resolvedParams.id) || [];
  const canManage = userRole === 'admin' || tournament?.creatorId === user?.uid;
  const loading = loadingTournament || loadingAllPlayers || loadingMatches;

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /> Cargando...</div>
  }
  if (!canManage) {
    // Redirect if the user lands here without permission
    if(tournament?.id) router.push(`/dashboard/tournaments/${tournament.id}/bracket`);
    return <div>No tienes permiso para ver esta página. Redirigiendo...</div>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Partidos del Torneo</CardTitle>
          <CardDescription>
            Administra y carga los resultados de todos los partidos del torneo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador 1</TableHead>
                <TableHead className="w-[50px] text-center"></TableHead>
                <TableHead>Jugador 2</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tournamentMatches.length > 0 ? tournamentMatches.map(match => {
                const player1 = getPlayerById(match.player1Id);
                const player2 = getPlayerById(match.player2Id);
                return (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarImage src={player1?.avatar} /><AvatarFallback>{player1?.firstName?.substring(0, 1)}{player1?.lastName?.substring(0, 1)}</AvatarFallback></Avatar>
                        {player1?.displayName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold"><Swords className="h-5 w-5 mx-auto text-muted-foreground" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8"><AvatarImage src={player2?.avatar} /><AvatarFallback>{player2?.firstName?.substring(0, 1)}{player2?.lastName?.substring(0, 1)}</AvatarFallback></Avatar>
                        {player2?.displayName}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant={match.status === 'Completado' ? 'secondary' : 'default'}>{match.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {match.status === 'Pendiente' ? (
                        <Badge variant="outline">Pendiente</Badge>
                      ) : (
                         <div className="flex flex-col items-end">
                             <span className="font-semibold">
                                {getPlayerById(match.winnerId)?.displayName || 'N/A'}
                             </span>
                             {match.score && <span className="text-xs text-muted-foreground">{match.score}</span>}
                         </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No hay partidos generados para este torneo aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
