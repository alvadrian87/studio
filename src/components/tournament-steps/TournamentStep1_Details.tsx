
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardDescription, CardTitle } from "../ui/card";

export default function TournamentStep1Details() {
  const { control } = useFormContext();

  return (
    <div className="space-y-6">
        <div>
            <CardTitle>Paso 1: Detalles Básicos</CardTitle>
            <CardDescription>Información general sobre tu nuevo torneo.</CardDescription>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
             <FormField
                control={control}
                name="tipoTorneo"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Tipo de Torneo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de torneo" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Individual">Individual</SelectItem>
                        <SelectItem value="Por Equipos">Por Equipos</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={control}
                name="nombreTorneo"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre del Torneo</FormLabel>
                        <FormControl><Input placeholder="Abierto de Verano" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="organizacion"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Organización</FormLabel>
                        <FormControl><Input placeholder="Club de Tenis Local" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="ubicacion"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ubicación</FormLabel>
                        <FormControl><Input placeholder="Ciudad, País" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="fechaInicio"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fecha de Inicio</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="fechaFin"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fecha de Fin</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="md:col-span-2">
                 <FormField
                    control={control}
                    name="descripcion"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl><Textarea placeholder="Describe tu torneo..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="md:col-span-2">
                <FormField
                    control={control}
                    name="imagenBannerUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL de la Imagen del Banner</FormLabel>
                            <FormControl><Input placeholder="https://ejemplo.com/imagen.png" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    </div>
  );
}
