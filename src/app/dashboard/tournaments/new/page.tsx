
"use client";

import { TournamentForm } from "@/components/tournament-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewTournamentPage() {
  const { userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not an admin and not loading
    if (!loading && userRole !== 'admin') {
      router.push('/dashboard/tournaments');
    }
  }, [userRole, loading, router]);

  // Render nothing or a loading spinner while checking the role
  if (loading || userRole !== 'admin') {
    return <div>Verificando permisos...</div>;
  }
  
  return (
    <>
        <div className="flex items-center justify-between space-y-2">
            <div className="flex flex-col w-full">
                <h1 className="text-3xl font-bold tracking-tight">Crear Torneo</h1>
                <p className="text-muted-foreground">Sigue los pasos para configurar tu nuevo torneo.</p>
            </div>
        </div>
        <TournamentForm />
    </>
  )
}
