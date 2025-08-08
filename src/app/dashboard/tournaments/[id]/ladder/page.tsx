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
import { players, tournaments } from "@/lib/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Swords } from "lucide-react"

export default function LadderPage({ params }: { params: { id: string } }) {
  const tournament = tournaments.find(t => t.id === params.id) || tournaments[0];

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
            <h1 className="text-3xl font-bold tracking-tight">{tournament.name} Ladder</h1>
            <p className="text-muted-foreground">Player rankings and challenge status.</p>
        </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
          <CardDescription>The official ladder for the {tournament.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="hidden md:table-cell">Wins</TableHead>
                <TableHead className="hidden md:table-cell">Losses</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.sort((a, b) => a.rank - b.rank).map((player) => (
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
                        Challenge
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
