
import { useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardDescription, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

export default function TournamentStep1Details() {
  const { control } = useFormContext();
  const tipoTorneo = useWatch({ control, name: "tipoTorneo" });

  return (
    <div className="space-y-6">
        <div>
            <CardTitle>Paso 1: Detalles Básicos</CardTitle>
            <CardDescription>Información general sobre tu nuevo torneo.</CardDescription>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <Label>Tipo de Torneo</Label>
                <Input value={tipoTorneo} disabled className="mt-2"/>
            </div>
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
                            <FormLabel>Descripción (Opcional)</FormLabel>
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
                            <FormLabel>URL de la Imagen del Banner (Opcional)</FormLabel>
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
