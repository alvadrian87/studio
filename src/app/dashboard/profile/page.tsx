
'use client';

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useDocument } from "@/hooks/use-firestore";
import type { Player } from "@/hooks/use-firestore";
import { useToast } from "@/hooks/use-toast";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Upload } from "lucide-react";


const profileFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre es obligatorio." }),
  lastName: z.string().min(2, { message: "El apellido es obligatorio." }),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  residence: z.string().optional(),
  dominantHand: z.string().optional(),
  club: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: player, loading: loadingPlayer } = useDocument<Player>(user ? `users/${user.uid}` : 'users/dummy');
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      dateOfBirth: "",
      gender: "",
      residence: "",
      dominantHand: "",
      club: "",
    }
  });

 useEffect(() => {
    if (player) {
      form.reset({
        firstName: player.firstName || "",
        lastName: player.lastName || "",
        phoneNumber: player.phoneNumber || "",
        dateOfBirth: player.dateOfBirth || "",
        gender: player.gender || "",
        residence: player.residence || "",
        dominantHand: player.dominantHand || "",
        club: player.club || "",
      });
    }
  }, [player, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    setLoading(true);

    try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            ...data,
            displayName: `${data.firstName} ${data.lastName}`.trim(),
        });
        toast({ title: "¡Éxito!", description: "Tu perfil ha sido actualizado." });
    } catch (error) {
        console.error("Error al actualizar el perfil:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar tu perfil." });
    } finally {
        setLoading(false);
    }
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  async function onAvatarSubmit() {
    if (!user || !avatarFile) return;
    setLoading(true);
    
    try {
        const storage = getStorage();
        const filePath = `avatars/${user.uid}/${avatarFile.name}`;
        const storageRef = ref(storage, filePath);
        
        await uploadBytes(storageRef, avatarFile);
        const downloadURL = await getDownloadURL(storageRef);

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            avatar: downloadURL
        });
        toast({ title: "¡Éxito!", description: "Tu avatar ha sido actualizado." });
        setIsAvatarDialogOpen(false);
        setAvatarFile(null);
    } catch(error) {
        console.error("Error al actualizar el avatar:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar tu avatar." });
    } finally {
        setLoading(false);
    }
  }
  
  if (loadingPlayer) {
      return <div>Cargando perfil...</div>
  }

  if (!user || !player) {
    return null;
  }
  
  const getAvatarFallback = () => {
    if (!player) return user?.email?.substring(0, 1).toUpperCase() || 'U';
    const first = player.firstName ? player.firstName.substring(0, 1) : '';
    const last = player.lastName ? player.lastName.substring(0, 1) : '';
    return `${first}${last}`;
  }


  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div className="flex flex-col w-full">
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona la configuración de tu cuenta y tu información personal.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
            <Card>
            <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza aquí la información de tu perfil público.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={player.avatar || 'https://placehold.co/80x80.png'} />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                </Avatar>
                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                    <DialogTrigger asChild>
                        <Button type="button">Cambiar Foto</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cambiar Foto de Perfil</DialogTitle>
                            <DialogDescription>
                                Sube una nueva imagen para tu avatar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                           <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="avatar-file">Sube tu Imagen</Label>
                                <div className="flex items-center gap-2">
                                     <Input id="avatar-file" type="file" accept="image/*" onChange={handleAvatarFileChange} ref={avatarInputRef} className="hidden" />
                                     <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4"/>
                                        Seleccionar Archivo
                                     </Button>
                                     {avatarFile && <span className="text-sm text-muted-foreground truncate">{avatarFile.name}</span>}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAvatarDialogOpen(false)}>Cancelar</Button>
                            <Button type="button" onClick={onAvatarSubmit} disabled={loading || !avatarFile}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Guardar Avatar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                                <Input placeholder="Tu nombre" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Apellido</FormLabel>
                            <FormControl>
                                <Input placeholder="Tu apellido" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid gap-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input id="email" type="email" defaultValue={user.email || ""} disabled />
                    </div>
                     <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Celular</FormLabel>
                            <FormControl>
                                <Input type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Fecha de Nacimiento</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Género</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona tu género" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="masculino">Masculino</SelectItem>
                                    <SelectItem value="femenino">Femenino</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                    <SelectItem value="prefiero-no-decir">Prefiero no decir</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <div className="grid gap-2 md:col-span-2">
                        <FormField
                            control={form.control}
                            name="residence"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Lugar de Residencia</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader>
                <CardTitle>Información del Jugador (Opcional)</CardTitle>
                <CardDescription>Detalles adicionales sobre tu estilo de juego.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                 <FormField
                    control={form.control}
                    name="dominantHand"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Mano Hábil</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona tu mano hábil" />
                            </SelectTrigger>
                           </FormControl>
                            <SelectContent>
                                <SelectItem value="diestro">Diestro/a</SelectItem>
                                <SelectItem value="zurdo">Zurdo/a</SelectItem>
                                <SelectItem value="ambidiestro">Ambidiestro/a</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="club"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Club donde Juegas</FormLabel>
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Guardar todo</CardTitle>
                    <CardDescription>Haz clic a continuación para guardar todos los cambios realizados en tu perfil.</CardDescription>
                </Header>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </CardFooter>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Contraseña</CardTitle>
                <CardDescription>Cambia tu contraseña aquí. Es una buena idea usar una contraseña segura que no estés usando en otro lugar. (Funcionalidad no implementada aún).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="current-password">Contraseña Actual</Label>
                    <Input id="current-password" type="password" disabled />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <Input id="new-password" type="password" disabled />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                    <Input id="confirm-password" type="password" disabled />
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button disabled>Actualizar Contraseña</Button>
            </CardFooter>
            </Card>
        </form>
      </Form>
    </>
  )
}
