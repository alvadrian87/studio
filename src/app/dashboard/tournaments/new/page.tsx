import { TournamentForm } from "@/components/tournament-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function NewTournamentPage() {
  return (
    <>
        <div className="flex items-center justify-between space-y-2">
            <div className="flex flex-col w-full">
                <h1 className="text-3xl font-bold tracking-tight">Crear Torneo</h1>
                <p className="text-muted-foreground">Completa los detalles a continuación para crear un nuevo torneo.</p>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Detalles del Torneo</CardTitle>
                <CardDescription>Usa nuestro asistente de IA para ayudarte a configurar los ajustes.</CardDescription>
            </CardHeader>
            <CardContent>
                <TournamentForm />
            </CardContent>
        </Card>
    </>
  )
}
