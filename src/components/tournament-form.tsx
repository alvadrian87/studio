
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState, useEffect } from "react"
import type { SuggestTournamentSettingsOutput } from "@/ai/flows/suggest-tournament-settings"
import { addDoc, collection, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import type { Tournament } from "@/hooks/use-firestore"
import { useAuth } from "@/hooks/use-auth"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Sparkles, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { suggestTournamentSettings } from "@/ai/flows/suggest-tournament-settings"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const formSchema = z.object({
  tournamentName: z.string().min(2, {
    message: "El nombre del torneo debe tener al menos 2 caracteres.",
  }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Formato de fecha inválido.",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Formato de fecha inválido.",
  }),
  location: z.string().min(2, {
    message: "La ubicación debe tener al menos 2 caracteres.",
  }),
  format: z.enum(['Eliminación Simple', 'Doble Eliminación', 'Round Robin', 'Escalera']),
  numberOfPlayers: z.coerce.number().int().positive(),
  entryFee: z.coerce.number().min(0),
  prizePoolDistribution: z.string().min(10, {
    message: "Los detalles de la distribución del pozo de premios deben tener al menos 10 caracteres.",
  }),
  rules: z.string().min(20, {
    message: "Las reglas deben tener al menos 20 caracteres.",
  }),
  isRanked: z.boolean(),
  bannerUrl: z.string().url({ message: "Por favor, introduce una URL válida." }).optional().or(z.literal('')),
})

interface TournamentFormProps {
  tournament?: Tournament;
}

const TOTAL_STEPS = 4;

export function TournamentForm({ tournament }: TournamentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false);
  const [aiResult, setAiResult] = useState<SuggestTournamentSettingsOutput | null>(null)
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const isEditMode = !!tournament;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentName: "Copa de Verano EvoLadder",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0],
      location: "En línea",
      format: "Eliminación Simple",
      numberOfPlayers: 16,
      entryFee: 10,
      prizePoolDistribution: "1er: 60%, 2do: 30%, 3er: 10%",
      rules: "Se aplican las reglas estándar del torneo. Todas las partidas son al mejor de 3.",
      isRanked: true,
      bannerUrl: "",
    },
  })

   useEffect(() => {
    if (isEditMode && tournament) {
      form.reset({
        tournamentName: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        location: tournament.location,
        format: tournament.format,
        numberOfPlayers: tournament.numberOfPlayers,
        entryFee: tournament.entryFee,
        prizePoolDistribution: tournament.prizePoolDistribution,
        rules: tournament.rules,
        isRanked: tournament.isRanked ?? true,
        bannerUrl: tournament.bannerUrl || "",
      });
    }
  }, [isEditMode, tournament, form]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof z.infer<typeof formSchema>)[] = [];
    if (currentStep === 1) {
        fieldsToValidate = ['tournamentName', 'location', 'startDate', 'endDate', 'format'];
    } else if (currentStep === 2) {
        fieldsToValidate = ['numberOfPlayers', 'entryFee', 'isRanked', 'bannerUrl'];
    } else if (currentStep === 3) {
        fieldsToValidate = ['prizePoolDistribution', 'rules'];
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
      if (currentStep > 1) {
          setCurrentStep(prev => prev - 1);
      }
  };


  async function onSuggest() {
    const values = form.getValues()
    const { bannerUrl, ...valuesForAI } = values;
    const validation = formSchema.partial().safeParse(valuesForAI);
    
    if (!validation.success) {
      form.trigger()
      return
    }

    setLoading(true)
    setAiResult(null)
    try {
      const result = await suggestTournamentSettings({
        ...validation.data,
        tournamentName: validation.data.tournamentName!,
        startDate: validation.data.startDate!,
        endDate: validation.data.endDate!,
        location: validation.data.location!,
        format: validation.data.format!,
        numberOfPlayers: validation.data.numberOfPlayers!,
        entryFee: validation.data.entryFee!,
        prizePoolDistribution: validation.data.prizePoolDistribution!,
        rules: validation.data.rules!,
      })
      setAiResult(result)
    } catch (error) {
      console.error("La sugerencia de IA falló:", error)
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No se pudieron obtener las sugerencias. Por favor, inténtalo de nuevo.",
      });
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitLoading(true);
    if (!user) {
        toast({
            variant: "destructive",
            title: "Error de autenticación",
            description: "Debes iniciar sesión para realizar esta acción.",
        });
        setSubmitLoading(false);
        return;
    }
    
    try {
      const tournamentData = {
        name: values.tournamentName,
        ...values,
      };

      if (isEditMode && tournament) {
        const tournamentRef = doc(db, "tournaments", tournament.id);
        await updateDoc(tournamentRef, tournamentData);
        toast({
            title: "¡Torneo Actualizado!",
            description: "El torneo ha sido actualizado exitosamente.",
        });
      } else {
         const newTournament = {
            ...tournamentData,
            status: 'Próximo',
            creatorId: user.uid,
            participants: [],
        };
        await addDoc(collection(db, "tournaments"), newTournament);
        toast({
            title: "¡Torneo Creado!",
            description: "El torneo ha sido creado exitosamente.",
        });
      }
      
      router.push('/dashboard/tournaments');

    } catch (error) {
      console.error("Error al procesar el torneo: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar el torneo. Por favor, inténtalo de nuevo.",
      });
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <>
      <Progress value={(currentStep / TOTAL_STEPS) * 100} className="mb-6" />
      <Card>
          <CardContent className="pt-6">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      {currentStep === 1 && (
                          <div className="grid md:grid-cols-2 gap-8">
                              <FormField
                                  control={form.control}
                                  name="tournamentName"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Nombre del Torneo</FormLabel>
                                          <FormControl>
                                              <Input placeholder="p. ej., Abierto de Verano" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="location"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Ubicación</FormLabel>
                                          <FormControl>
                                              <Input placeholder="p. ej., Centro de Tenis de la Ciudad" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="startDate"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Fecha de Inicio</FormLabel>
                                          <FormControl>
                                              <Input type="date" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="endDate"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Fecha de Finalización</FormLabel>
                                          <FormControl>
                                              <Input type="date" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="format"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Formato</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Selecciona un formato de torneo" />
                                                  </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  <SelectItem value="Eliminación Simple">Eliminación Simple</SelectItem>
                                                  <SelectItem value="Doble Eliminación">Doble Eliminación</SelectItem>
                                                  <SelectItem value="Round Robin">Round Robin</SelectItem>
                                                  <SelectItem value="Escalera">Escalera</SelectItem>
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                      )}

                      {currentStep === 2 && (
                          <div className="grid md:grid-cols-2 gap-8">
                              <FormField
                                  control={form.control}
                                  name="numberOfPlayers"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Número de Jugadores</FormLabel>
                                          <FormControl>
                                              <Input type="number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="entryFee"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Cuota de Inscripción ($)</FormLabel>
                                          <FormControl>
                                              <Input type="number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="isRanked"
                                  render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
                                          <div className="space-y-0.5">
                                              <FormLabel className="text-base">Partidas de Ranking</FormLabel>
                                              <FormDescription>
                                                  ¿Las partidas de este torneo afectarán al Ranking Global (ELO)?
                                              </FormDescription>
                                          </div>
                                          <FormControl>
                                              <Switch
                                                  checked={field.value}
                                                  onCheckedChange={field.onChange}
                                              />
                                          </FormControl>
                                      </FormItem>
                                  )}
                              />
                              <div className="md:col-span-2">
                                  <FormField
                                      control={form.control}
                                      name="bannerUrl"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormLabel>URL del Banner del Torneo</FormLabel>
                                              <FormControl>
                                                  <Input placeholder="https://example.com/banner.png" {...field} />
                                              </FormControl>
                                              <FormDescription>
                                                  Pega la URL de una imagen para que sirva como banner para la página del torneo.
                                              </FormDescription>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                              </div>
                          </div>
                      )}

                      {currentStep === 3 && (
                          <div className="space-y-8">
                              <FormField
                                  control={form.control}
                                  name="prizePoolDistribution"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Distribución del Pozo de Premios</FormLabel>
                                          <FormControl>
                                              <Textarea placeholder="Describe cómo se distribuirá el pozo de premios..." {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="rules"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Reglas</FormLabel>
                                          <FormControl>
                                              <Textarea placeholder="Describe las reglas del torneo..." {...field} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                      )}
                      
                      {currentStep === 4 && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-medium">Revisar y Enviar</h3>
                            <p className="text-sm text-muted-foreground">Revisa la configuración del torneo a continuación. Usa el Asistente de IA para obtener sugerencias antes de enviar.</p>
                             {aiResult && (
                              <Alert variant={aiResult.isValid ? "default" : "destructive"}>
                                {aiResult.isValid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                <AlertTitle>{aiResult.isValid ? "¡La configuración se ve bien!" : "Problemas Potenciales Encontrados"}</AlertTitle>
                                <AlertDescription>
                                  <p className="mb-2">{aiResult.reason}</p>
                                  {aiResult.suggestions.length > 0 && (
                                    <ul className="list-disc pl-5 space-y-1">
                                      {aiResult.suggestions.map((suggestion, index) => (
                                        <li key={index}>{suggestion}</li>
                                      ))}
                                    </ul>
                                  )}
                                </AlertDescription>
                              </Alert>
                            )}
                            <Button type="button" variant="outline" onClick={onSuggest} disabled={loading} className="w-full sm:w-auto">
                                {loading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Obtener Sugerencias de IA
                              </Button>
                          </div>
                      )}

                      <div className="flex justify-between gap-4 pt-4">
                          {currentStep > 1 && (
                              <Button type="button" variant="outline" onClick={handlePrevious}>
                                  <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
                              </Button>
                          )}
                          <div className="flex-grow"></div>
                          {currentStep < TOTAL_STEPS && (
                              <Button type="button" onClick={handleNext}>
                                  Siguiente
                              </Button>
                          )}
                          {currentStep === TOTAL_STEPS && (
                              <Button type="submit" disabled={submitLoading}>
                                 {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                 {isEditMode ? 'Guardar Cambios' : 'Crear Torneo'}
                              </Button>
                          )}
                      </div>
                  </form>
              </Form>
          </CardContent>
      </Card>
    </>
  )
}

    