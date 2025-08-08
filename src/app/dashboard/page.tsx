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
import { challenges, matches, players } from "@/lib/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Check, Clock, Swords, Trophy, X } from "lucide-react"

export default function Dashboard() {
  const player = players[0]; // Mock current player

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">¡Bienvenido de nuevo, {player.name}!</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clasificación Actual</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{player.rank}</div>
            <p className="text-xs text-muted-foreground">Top 1% de todos los jugadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Victorias</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{player.wins}</div>
            <p className="text-xs text-muted-foreground">2 más para el siguiente rango</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Derrotas</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{player.losses}</div>
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
              {((player.wins / (player.wins + player.losses)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Comparado con la temporada pasada</p>
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
                {matches.slice(0, 5).map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={match.player2.avatar} alt={match.player2.name} />
                          <AvatarFallback>{match.player2.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{match.player2.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={match.status === 'Completado' ? 'default' : 'secondary'}>{match.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{match.date}</TableCell>
                    <TableCell className="text-right">
                       <Badge variant={match.winnerId === player.id ? "default" : "destructive"}>
                        {match.winnerId === player.id ? 'Victoria' : 'Derrota'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
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
            <div className=" space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={challenge.from.avatar} alt="Avatar" />
                    <AvatarFallback>{challenge.from.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {challenge.from.name} desafió a {challenge.to.name}
                    </p>
                    <p className="text-sm text-muted-foreground">Estado: {challenge.status}</p>
                  </div>
                  <div className="ml-auto font-medium flex gap-2">
                    <Button size="sm" variant="outline"><Check className="h-4 w-4 mr-1"/> Aceptar</Button>
                    <Button size="sm" variant="destructive"><X className="h-4 w-4 mr-1"/> Rechazar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
