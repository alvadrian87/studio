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
                <h1 className="text-3xl font-bold tracking-tight">Create Tournament</h1>
                <p className="text-muted-foreground">Fill in the details below to create a new tournament.</p>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>Use our AI assistant to help you configure the settings.</CardDescription>
            </CardHeader>
            <CardContent>
                <TournamentForm />
            </CardContent>
        </Card>
    </>
  )
}
