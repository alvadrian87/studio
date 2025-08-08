
"use client";

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

interface Props {
    isLadder: boolean;
}

export default function TournamentStep4Timing({ isLadder }: Props) {
  const { control } = useFormContext();

  const stepNumber = isLadder ? 4 : 3;

  return (
    <div className="space-y-6">
        <div>
            <CardTitle>Paso {stepNumber}: Tiempos y Contacto</CardTitle>
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

            {isLadder && (
                 <>
                    <FormField
                        control={control}
                        name="fechaCierreDesafios"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cierre de Fase de Desafíos</FormLabel>
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
                        name="tiempoLimiteAceptarDesafio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tiempo Límite para Aceptar (horas)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="tiempoLimiteJugarPartido"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tiempo Límite para Jugar (días)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}


            <div className="md:col-span-2 pt-4">
                <h3 className="text-lg font-medium mb-2">Información de Contacto</h3>
            </div>
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
