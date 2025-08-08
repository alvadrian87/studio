'use client';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth";
import { useDocument } from "@/hooks/use-firestore";
import type { Player } from "@/hooks/use-firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: player, loading } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  
  if (loading) {
      return <div>Cargando perfil...</div>
  }

  if (!user || !player) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona la configuración de tu cuenta y tu información personal.</p>
        </div>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Actualiza aquí la información de tu perfil público.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={player.avatar || 'https://placehold.co/80x80.png'} />
                <AvatarFallback>{player.firstName?.substring(0, 1) || 'U'}{player.lastName?.substring(0, 1) || ''}</AvatarFallback>
              </Avatar>
              <Button>Cambiar Foto</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input id="firstName" defaultValue={player.firstName || ""} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input id="lastName" defaultValue={player.lastName || ""} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" type="email" defaultValue={user.email || ""} disabled />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="phoneNumber">Celular</Label>
                    <Input id="phoneNumber" type="tel" defaultValue={player.phoneNumber || ""} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
                    <Input id="dateOfBirth" type="date" defaultValue={player.dateOfBirth || ""} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="gender">Género</Label>
                     <Select defaultValue={player.gender}>
                        <SelectTrigger id="gender">
                            <SelectValue placeholder="Selecciona tu género" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="femenino">Femenino</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                            <SelectItem value="prefiero-no-decir">Prefiero no decir</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="residence">Lugar de Residencia</Label>
                    <Input id="residence" defaultValue={player.residence || ""} />
                </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button>Guardar Cambios</Button>
          </CardFooter>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Información del Jugador (Opcional)</CardTitle>
            <CardDescription>Detalles adicionales sobre tu estilo de juego.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-2">
                <Label htmlFor="dominantHand">Mano Hábil</Label>
                 <Select defaultValue={player.dominantHand}>
                    <SelectTrigger id="dominantHand">
                        <SelectValue placeholder="Selecciona tu mano hábil" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="diestro">Diestro/a</SelectItem>
                        <SelectItem value="zurdo">Zurdo/a</SelectItem>
                        <SelectItem value="ambidiestro">Ambidiestro/a</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="club">Club donde Juegas</Label>
                <Input id="club" defaultValue={player.club || ""} />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button>Guardar Cambios</Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>Cambia tu contraseña aquí. Es una buena idea usar una contraseña segura que no estés usando en otro lugar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input id="current-password" type="password" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input id="new-password" type="password" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input id="confirm-password" type="password" />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button>Actualizar Contraseña</Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
