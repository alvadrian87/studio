import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, BrainCircuit, CheckCircle, ListOrdered, Shield, Swords, Trophy, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { TennisBallIcon } from '@/components/icons';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Trophy className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-bold">Gestor EvoLadder</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Características
          </Link>
          <Link href="#ai-management" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Gestión con IA
          </Link>
          <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Iniciar Sesión
          </Link>
          <Button asChild>
            <Link href="/dashboard">Comenzar</Link>
          </Button>
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
                    El Gestor EvoLadder proporciona una plataforma fluida, atractiva y justa para todas tus necesidades de juego competitivo. Crea, gestiona y participa en torneos con facilidad.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard">Crear un Torneo</Link>
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
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Todo lo que Necesitas para Organizar un Torneo</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Desde paneles de jugador hasta herramientas de gestión inteligentes, te tenemos cubierto.
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
                <h3 className="text-xl font-bold">Operaciones CRUD</h3>
                <p className="text-sm text-muted-foreground">
                  Control total sobre usuarios, torneos y partidas con una funcionalidad completa de Crear, Leer, Actualizar y Eliminar.
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
        <section id="ai-management" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Gestión de Torneos más Inteligente con <span className="text-primary">IA</span>
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Deja que nuestro asistente de IA valide las configuraciones de tu torneo, detecte configuraciones incorrectas y sugiera mejoras para un evento perfectamente equilibrado.
              </p>
            </div>
            <div className="mx-auto w-full max-w-4xl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                    Sugerencias Impulsadas por IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-left space-y-4">
                      <p className="text-muted-foreground">Simplemente introduce los detalles de tu torneo y nuestra IA analizará la configuración en busca de equidad, equilibrio y solidez logística. Es como tener un organizador de torneos profesional a tu lado.</p>
                      <div className="flex items-start space-x-4 rounded-md bg-secondary p-4">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                        <div>
                          <p className="font-semibold">Ejemplo de Sugerencia</p>
                          <p className="text-sm text-muted-foreground">Considera cambiar el formato a Doble Eliminación para un torneo de este tamaño para aumentar la participación de los jugadores.</p>
                        </div>
                      </div>
                  </div>
                </CardContent>
              </Card>
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
