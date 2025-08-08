
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CardDescription, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

export default function TournamentStep0Type() {
  const { control } = useFormContext();

  return (
    <div className="space-y-6">
        <div>
            <CardTitle>Paso Cero: Tipo de Torneo</CardTitle>
            <CardDescription>Comienza por seleccionar qué tipo de torneo deseas crear.</CardDescription>
        </div>
        <FormField
            control={control}
            name="tipoTorneo"
            render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                        >
                            <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <RadioGroupItem value="Evento por Llaves" />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <Label htmlFor="type-keys">Evento por Llaves (Individual o Equipos)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Crea un torneo tradicional con llaves de eliminación, round robin, etc.
                                    </p>
                                </div>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <RadioGroupItem value="Evento tipo Escalera" />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <Label htmlFor="type-ladder">Evolution Challenge (Escalera)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Configura un torneo de ranking continuo basado en desafíos directos entre jugadores.
                                    </p>
                                </div>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    </div>
  );
}
