
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart, BrainCircuit, CheckCircle, ListOrdered, LogIn, LogOut, Shield, Swords, Trophy, UserPlus, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TennisBallIcon } from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import type { Player } from '@/types';
import { useDocument } from '@/hooks/use-firestore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useAuth();
  const { data: player } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const getAvatarFallback = () => {
    if (!player) return user?.email?.substring(0, 1).toUpperCase() || 'U';
    const first = player.firstName ? player.firstName.substring(0, 1) : '';
    const last = player.lastName ? player.lastName.substring(0, 1) : '';
    return `${first}${last}`;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Trophy className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-bold">Gestor EvoLadder</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          {user ? (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative flex items-center gap-3 pr-4 pl-2 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player?.avatar || "https://placehold.co/40x40.png"} alt={player?.displayName || "Usuario"} />
                      <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline-block font-medium">{player?.displayName || 'Usuario'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link href="/dashboard">Panel</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href="/dashboard/profile">Perfil</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Cerrar Sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          ) : (
            <>
              <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                Características
              </Link>
              <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                Iniciar Sesión
              </Link>
              <Button asChild>
                <Link href="/signup">Registrarse</Link>
              </Button>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    El Sistema Definitivo de Clasificación de Torneos
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    EvoLadder Manager te ofrece una plataforma fluida, atractiva y justa para todas tus necesidades de juego competitivo. Encuentra torneos, compite y sigue tu progreso con facilidad.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard/tournaments">Explorar Torneos</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="#features">Aprende Más</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                width="600"
                height="400"
                alt="Hero"
                data-ai-hint="esports tournament"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Características Clave</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Todo lo que Necesitas para Competir al Máximo Nivel</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Desde paneles de jugador personalizados hasta un sistema de desafíos dinámico, tenemos todo lo que necesitas para llevar tu juego al siguiente nivel.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <ListOrdered className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Clasificaciones Dinámicas</h3>
                <p className="text-sm text-muted-foreground">
                  Visualiza el progreso del torneo con nuestra pantalla de clasificación interactiva, que muestra las clasificaciones y el estado de los desafíos en tiempo real.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Paneles de Jugador</h3>
                <p className="text-sm text-muted-foreground">
                  Los jugadores pueden seguir su perfil, historial de desafíos, clasificaciones y estadísticas de rendimiento detalladas.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Swords className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Sistema de Desafíos</h3>
                <p className="text-sm text-muted-foreground">
                  Permite a los jugadores lanzar desafíos a otros, con reglas de backend para garantizar partidas justas y competitivas.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Gestión de Perfil</h3>
                <p className="text-sm text-muted-foreground">
                  Control total sobre tu información personal, estadísticas de juego y configuración de la cuenta.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <TennisBallIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Mercado</h3>
                <p className="text-sm text-muted-foreground">
                  Un mercado integrado para que los usuarios intercambien, vendan o compren artículos y servicios relacionados con los juegos.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <BarChart className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Estadísticas Avanzadas</h3>
                <p className="text-sm text-muted-foreground">
                  Análisis detallados sobre sets ganados, porcentajes de victorias en juegos y más para ayudar a los jugadores a mejorar su estrategia.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Gestor EvoLadder. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Términos de Servicio
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  );
}
