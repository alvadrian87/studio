
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardDescription, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Info } from "lucide-react";

export default function TournamentStep3LadderRules() {
  const { control } = useFormContext();

  return (
    <div className="space-y-6">
        <div>
            <CardTitle>Paso 3: Reglas de la Escalera y Formatos</CardTitle>
            <CardDescription>Define las reglas de desafío que se aplicarán a todo el torneo.</CardDescription>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Lógica de Desafíos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                <li>Un retador puede desafiar a alguien que esté hasta <strong>X</strong> posiciones por encima.</li>
                <li>El jugador en <strong>1er puesto</strong> puede ser desafiado por jugadores hasta <strong>Y</strong> posiciones por debajo.</li>
                <li>El jugador en el <strong>último puesto</strong> puede desafiar hasta <strong>Z</strong> posiciones por encima.</li>
                <li>Si el retador gana, intercambia su posición con el desafiado. Si pierde, las posiciones se mantienen.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-6">
            <FormField
                control={control}
                name="reglasLadder.posicionesDesafioArriba"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Desafío hacia arriba (X)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name="reglasLadder.posicionesDesafioAbajoPrimerPuesto"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alcance del 1er Puesto (Y)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name="reglasLadder.posicionesDesafioArribaUltimoPuesto"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Impulso del Último Puesto (Z)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div>
            <h3 className="text-lg font-medium mb-4">Formato de Puntuación</h3>
            <FormField
                control={control}
                name="formatoScore"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Formato de Score</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecciona un formato de puntuación" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="2 Sets + Super Tiebreak">2 Sets con Super Tiebreak a 10</SelectItem>
                        <SelectItem value="3 Sets Completos">Al mejor de 3 Sets Completos</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

    </div>
  );
}
