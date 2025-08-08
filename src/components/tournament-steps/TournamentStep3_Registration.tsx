
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CardDescription, CardTitle } from "../ui/card";

export default function TournamentStep3Registration() {
  const { control } = useFormContext();

  return (
    <div className="space-y-6">
        <div>
            <CardTitle>Paso 3: Registro y Contacto</CardTitle>
            <CardDescription>Configura las fechas de inscripción y la información de contacto.</CardDescription>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
            <FormField
                control={control}
                name="fechaInicioInscripciones"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Inicio de Inscripciones</FormLabel>
                        <FormControl><Input type="datetime-local" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name="fechaCierreInscripciones"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cierre de Inscripciones</FormLabel>
                        <FormControl><Input type="datetime-local" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="maximoInscripciones"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Máximo de Inscripciones (opcional)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="contactoNombre"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre de Contacto</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="contactoEmail"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email de Contacto</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="contactoTelefono"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Teléfono de Contacto (opcional)</FormLabel>
                        <FormControl><Input type="tel" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    </div>
  );
}
