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
import { players } from "@/lib/data"

export default function ProfilePage() {
  const player = players[0] // Mock current player

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
                <AvatarImage src={player.avatar} />
                <AvatarFallback>{player.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <Button>Cambiar Foto</Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Nombre de usuario</Label>
              <Input id="username" defaultValue={player.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" defaultValue={`${player.name.toLowerCase()}@evoladder.com`} />
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
