
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";

interface LadderEventCardProps {
    index: number;
    control: any;
    onRemove: (index: number) => void;
}

export function LadderEventCard({ index, control, onRemove }: LadderEventCardProps) {
    const tipoDeJuego = useWatch({ control, name: `events.${index}.tipoDeJuego` });
    const isSingles = tipoDeJuego === 'Singles';
    
    return (
        <Card className="relative">
            <CardHeader>
                <CardTitle className="text-lg">{`Categoría/División ${index + 1}`}</CardTitle>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 text-destructive hover:bg-destructive/10"
                    onClick={() => onRemove(index)}
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
}
