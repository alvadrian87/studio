
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { addDoc, collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Tournament, TournamentEvent } from "@/hooks/use-firestore";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import TournamentStep1Details from "./tournament-steps/TournamentStep1_Details";
import TournamentStep2Events from "./tournament-steps/TournamentStep2_Events";
import TournamentStep3Registration from "./tournament-steps/TournamentStep3_Registration";
import TournamentStep4Summary from "./tournament-steps/TournamentStep4_Summary";

const step1Schema = z.object({
    tipoTorneo: z.enum(['Individual', 'Por Equipos']),
    nombreTorneo: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    descripcion: z.string().optional(),
    organizacion: z.string().min(2, "La organización es requerida."),
    fechaInicio: z.string().min(1, "La fecha de inicio es requerida."),
    fechaFin: z.string().min(1, "La fecha de fin es requerida."),
    ubicacion: z.string().min(2, "La ubicación es requerida."),
    imagenBannerUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
}).refine(data => new Date(data.fechaFin) >= new Date(data.fechaInicio), {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["fechaFin"],
});

const eventSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    formatoTorneo: z.enum(['Single Elimination', 'Round Robin', 'First Match Backdraw', 'Ladder']),
    tipoDeJuego: z.enum(['Singles', 'Dobles']).optional(),
    sexo: z.enum(['Femenino', 'Masculino', 'Mixto', 'Abierto']).optional(),
    edadMinima: z.coerce.number().optional(),
    edadMaxima: z.coerce.number().optional(),
    eloMinimo: z.coerce.number().int(),
    eloMaximo: z.coerce.number().int(),
    tarifaInscripcion: z.coerce.number(),
    numJugadoresPorEquipo: z.coerce.number().int().optional(),
    configuracionRonda: z.string().optional(),
    eloMinimoEquipo: z.coerce.number().int().optional(),
    eloMaximoEquipo: z.coerce.number().int().optional(),
    tarifaInscripcionEquipo: z.coerce.number().optional(),
}).refine(data => !data.eloMaximo || data.eloMaximo >= data.eloMinimo, {
    message: "ELO máximo no puede ser menor que ELO mínimo.",
    path: ["eloMaximo"],
});


const step2Schema = z.object({
    events: z.array(eventSchema).min(1, "Debes agregar al menos una categoría o división."),
});

const step3Schema = z.object({
    fechaInicioInscripciones: z.string().min(1, "Requerido"),
    fechaCierreInscripciones: z.string().min(1, "Requerido"),
    maximoInscripciones: z.coerce.number().optional(),
    contactoNombre: z.string().min(2, "Requerido"),
    contactoEmail: z.string().email("Email inválido."),
    contactoTelefono: z.string().optional(),
});

const fullFormSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type FullFormValues = z.infer<typeof fullFormSchema>;


const TOTAL_STEPS = 4;

export function TournamentForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const [submitLoading, setSubmitLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();

    const methods = useForm<FullFormValues>({
        resolver: zodResolver(fullFormSchema),
        defaultValues: {
            tipoTorneo: 'Individual',
            nombreTorneo: "",
            organizacion: "",
            ubicacion: "",
            imagenBannerUrl: "",
            events: [],
            contactoNombre: "",
            contactoEmail: "",
        },
    });

    const handleNext = async () => {
        let schema;
        switch(currentStep) {
            case 1: schema = step1Schema; break;
            case 2: schema = step2Schema; break;
            case 3: schema = step3Schema; break;
            default: schema = z.object({});
        }

        const result = await schema.safeParseAsync(methods.getValues());
        
        // Clear previous errors before running new validation
        methods.clearErrors();

        if (!result.success) {
             result.error.errors.forEach((err) => {
                methods.setError(err.path.join('.') as keyof FullFormValues, {
                    type: 'manual',
                    message: err.message,
                });
            });
            return;
        }

        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    async function onSubmit(values: FullFormValues) {
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
            const { events, ...tournamentData } = values;

            const newTournamentDocRef = doc(collection(db, "tournaments"));
            const batch = writeBatch(db);

            const tournamentPayload: Omit<Tournament, 'id'> = {
                ...tournamentData,
                creatorId: user.uid,
                status: 'Próximo',
            };
            batch.set(newTournamentDocRef, tournamentPayload);

            events.forEach(event => {
                const newEventDocRef = doc(collection(db, "eventos"));
                const eventPayload: Omit<TournamentEvent, 'id' | 'torneoId'> = { ...event };
                batch.set(newEventDocRef, { ...eventPayload, torneoId: newTournamentDocRef.id });
            });

            await batch.commit();
            
            toast({
                title: "¡Torneo Creado!",
                description: "El torneo ha sido creado exitosamente.",
            });

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
        <FormProvider {...methods}>
            <Progress value={(currentStep / TOTAL_STEPS) * 100} className="mb-6" />
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                        {currentStep === 1 && <TournamentStep1Details />}
                        {currentStep === 2 && <TournamentStep2Events />}
                        {currentStep === 3 && <TournamentStep3Registration />}
                        {currentStep === 4 && <TournamentStep4Summary />}

                        <div className="flex justify-between gap-4 pt-4">
                            {currentStep > 1 && (
                                <Button type="button" variant="outline" onClick={handlePrevious}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
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
                                    Crear Torneo
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </FormProvider>
    );
}
