
"use client";

import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Trash2 } from "lucide-react";

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


        {fields.map((field, index) => {
          const tipoDeJuego = useWatch({ control, name: `events.${index}.tipoDeJuego`});
          const isSingles = tipoDeJuego === 'Singles';
          
          return (
            <Card key={field.id} className="relative">
                <CardHeader>
                    <CardTitle className="text-lg">{`Categoría/División ${index + 1}`}</CardTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                         <FormField
                            control={control}
                            name={`events.${index}.nombre`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre Categoría/División</FormLabel>
                                    <FormControl><Input placeholder="Ej: Singles Abierto" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`events.${index}.tipoDeJuego`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Juego</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Singles">Singles</SelectItem>
                                        <SelectItem value="Dobles">Dobles</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`events.${index}.sexo`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sexo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Femenino">Femenino</SelectItem>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Mixto">Mixto</SelectItem>
                                        <SelectItem value="Abierto">Abierto</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                     <div className="grid md:grid-cols-3 gap-4">
                        {isSingles ? (
                            <>
                                <FormField control={control} name={`events.${index}.ELOminimo`} render={({ field }) => ( <FormItem><FormLabel>ELO Mínimo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={control} name={`events.${index}.ELOmaximo`} render={({ field }) => ( <FormItem><FormLabel>ELO Máximo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </>
                        ) : (
                            <>
                                <FormField control={control} name={`events.${index}.ELOminimoEquipo`} render={({ field }) => ( <FormItem><FormLabel>ELO Mínimo Equipo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={control} name={`events.${index}.ELOmaximoEquipo`} render={({ field }) => ( <FormItem><FormLabel>ELO Máximo Equipo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </>
                        )}
                         <FormField control={control} name={`events.${index}.tarifaInscripcion`} render={({ field }) => ( <FormItem><FormLabel>Tarifa Inscripción ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                            control={control}
                            name={`events.${index}.valorIndiceClasificacion`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Índice de Actividad para Playoff</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                    <p className="text-xs text-muted-foreground pt-1">Valor mínimo que un jugador/equipo necesita para clasificar al playoff.</p>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name={`events.${index}.reglasEspecíficas`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reglas Específicas (Opcional)</FormLabel>
                                    <FormControl><Textarea placeholder="Ej: Jugadores de hasta 18 años" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>
          )
        })}
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
