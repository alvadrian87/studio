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

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
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
                <AvatarImage src={user.photoURL || 'https://placehold.co/80x80.png'} />
                <AvatarFallback>{user.displayName?.substring(0, 2) || user.email?.substring(0, 2) || 'U'}</AvatarFallback>
              </Avatar>
              <Button>Cambiar Foto</Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input id="username" defaultValue={user.displayName || ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" defaultValue={user.email || ""} disabled />
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
