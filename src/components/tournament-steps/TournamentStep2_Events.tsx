
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
import { Trash2 } from "lucide-react";

export default function TournamentStep2Events() {
  const { control } = useFormContext();
  const tipoTorneo = useWatch({ control, name: "tipoTorneo" });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "events",
  });
  
  const addEvent = () => {
    append({
        nombre: "",
        formatoTorneo: "Single Elimination",
        tipoDeJuego: "Singles",
        sexo: "Abierto",
        tarifaInscripcion: 0,
        numJugadoresPorEquipo: 2,
        configuracionRonda: "2 Singles, 1 Dobles",
        tarifaInscripcionEquipo: 0,
      });
  };
  
  const title = 'Categorías / Divisiones';
  const description = 'Define las diferentes categorías o divisiones para tu torneo por llaves.';


  return (
     <div className="space-y-6">
        <div>
            <CardTitle>Paso 2: {title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </div>

        {fields.map((field, index) => (
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
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField
                        control={control}
                        name={`events.${index}.nombre`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`events.${index}.formatoTorneo`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Formato de Juego</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Single Elimination">Eliminación Simple</SelectItem>
                                    <SelectItem value="Round Robin">Round Robin</SelectItem>
                                    <SelectItem value="First Match Backdraw">Consolación 1er Partido</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                        control={control}
                        name={`events.${index}.tipoDeJuego`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
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
                     <FormField
                        control={control}
                        name={`events.${index}.tarifaInscripcion`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tarifa ($ por jugador)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <h4 className="font-semibold text-sm pt-4">Opciones para Equipos</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                        control={control}
                        name={`events.${index}.numJugadoresPorEquipo`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Jugadores por Equipo</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={control}
                        name={`events.${index}.configuracionRonda`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Configuración de Ronda</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                      <FormField
                        control={control}
                        name={`events.${index}.tarifaInscripcionEquipo`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tarifa ($ por equipo)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
          </Card>
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

