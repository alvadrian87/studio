
"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardDescription, CardTitle } from "../ui/card";
import { LadderEventCard } from "./LadderEventCard";

export default function TournamentStep2LadderEvents() {
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "events",
  });
  
  const addEvent = () => {
    append({
        nombre: "",
        tipoDeJuego: "Singles",
        sexo: "Abierto",
        reglasEspecíficas: "",
        valorIndiceClasificacion: 10,
        ELOminimo: 0,
        ELOmaximo: 3000,
        ELOminimoEquipo: 0,
        ELOmaximoEquipo: 6000,
        tarifaInscripcion: 0,
      });
  };
  
  const title = 'Categorías / Divisiones';
  const description = 'Define las diferentes categorías de tu torneo de Escalera. Puedes añadir múltiples, por ejemplo, una para Singles y otra para Dobles.';


  return (
     <div className="space-y-6">
        <div>
            <CardTitle>Paso 2: {title} y Orden Inicial</CardTitle>
            <CardDescription>{description}</CardDescription>
        </div>
        
        <FormField
            control={control}
            name="metodoOrdenInicial"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Método de Orden Inicial</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                    <SelectTrigger>
                    <SelectValue placeholder="Selecciona cómo ordenar a los jugadores al inicio" />
                    </SelectTrigger>
                </FormControl>
                <SelectContent>
                    <SelectItem value="Ordenar por ELO">Ordenar por ELO</SelectItem>
                    <SelectItem value="Ordenar manualmente">Ordenar manualmente (post-inscripción)</SelectItem>
                </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
            )}
        />


        {fields.map((field, index) => (
            <LadderEventCard 
                key={field.id} 
                index={index} 
                control={control}
                onRemove={() => remove(index)}
            />
        ))}
        <Button
            type="button"
            variant="outline"
            onClick={addEvent}
        >
            Añadir Categoría/División
        </Button>
    </div>
  );
}
