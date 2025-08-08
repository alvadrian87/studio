
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
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

import TournamentStep0Type from "./tournament-steps/TournamentStep0_Type";
import TournamentStep1Details from "./tournament-steps/TournamentStep1_Details";
import TournamentStep2Events from "./tournament-steps/TournamentStep2_Events";
import TournamentStep2LadderEvents from "./tournament-steps/TournamentStep2_Ladder_Events";
import TournamentStep3LadderRules from "./tournament-steps/TournamentStep3_Ladder_Rules";
import TournamentStep4Timing from "./tournament-steps/TournamentStep4_Timing";
import TournamentStep5Summary from "./tournament-steps/TournamentStep5_Summary";

const step0Schema = z.object({
    tipoTorneo: z.enum(['Evento por Llaves', 'Evento tipo Escalera'], { required_error: "Debes seleccionar un tipo de torneo." }),
});

const step1Schema = z.object({}).extend({
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
    tarifaInscripcion: z.coerce.number(),
    numJugadoresPorEquipo: z.coerce.number().int().optional(),
    configuracionRonda: z.string().optional(),
    tarifaInscripcionEquipo: z.coerce.number().optional(),
});

const ladderEventSchema = z.object({
    nombre: z.string().min(3, "El nombre de la categoría es obligatorio."),
    tipoDeJuego: z.enum(['Singles', 'Dobles']),
    sexo: z.enum(['Femenino', 'Masculino', 'Mixto', 'Abierto']),
    reglasEspecíficas: z.string().optional(),
    valorIndiceClasificacion: z.coerce.number().min(0, "Debe ser un valor positivo."),
    ELOminimo: z.coerce.number().int().optional(),
    ELOmaximo: z.coerce.number().int().optional(),
    ELOminimoEquipo: z.coerce.number().int().optional(),
    ELOmaximoEquipo: z.coerce.number().int().optional(),
    tarifaInscripcion: z.coerce.number().min(0),
}).refine(data => !data.ELOmaximo || data.ELOmaximo >= (data.ELOminimo || 0), {
    message: "ELO máximo no puede ser menor que ELO mínimo.",
    path: ["ELOmaximo"],
});

const step2KeyedSchema = z.object({
    events: z.array(eventSchema).min(1, "Debes agregar al menos una categoría o división."),
});

const step2LadderSchema = z.object({
    metodoOrdenInicial: z.enum(['Ordenar por ELO', 'Ordenar manualmente']),
    events: z.array(ladderEventSchema).min(1, "Debes agregar al menos una categoría."),
});

const step3LadderSchema = z.object({
    reglasLadder: z.object({
        posicionesDesafioArriba: z.coerce.number().int().positive(),
        posicionesDesafioAbajoPrimerPuesto: z.coerce.number().int().positive(),
        posicionesDesafioArribaUltimoPuesto: z.coerce.number().int().positive(),
    }),
    formatoScore: z.enum(['2 Sets + Super Tiebreak', '3 Sets Completos']),
});

const step4Schema = z.object({}).extend({
    fechaInicioInscripciones: z.string().min(1, "Requerido"),
    fechaCierreInscripciones: z.string().min(1, "Requerido"),
    fechaCierreDesafios: z.string().optional(),
    tiempoLimiteAceptarDesafio: z.coerce.number().int().positive().optional(),
    tiempoLimiteJugarPartido: z.coerce.number().int().positive().optional(),
    maximoInscripciones: z.coerce.number().optional(),
    contactoNombre: z.string().min(2, "Requerido"),
    contactoEmail: z.string().email("Email inválido."),
    contactoTelefono: z.string().optional(),
});


const getFullFormSchema = (torneoType: string) => {
    let schema = step0Schema.merge(step1Schema);

    if (torneoType === 'Evento tipo Escalera') {
        schema = schema
            .merge(step2LadderSchema)
            .merge(step3LadderSchema)
            .merge(step4Schema);
    } else {
        // Default to 'Evento por Llaves' if type is not ladder or not set
        schema = schema
            .merge(step2KeyedSchema)
            .merge(step4Schema);
    }
    return schema;
}

type FullFormValues = z.infer<ReturnType<typeof getFullFormSchema>>;

const TOTAL_STEPS = 5;

export function TournamentForm() {
    const [currentStep, setCurrentStep] = useState(0);
    const [submitLoading, setSubmitLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [torneoType, setTorneoType] = useState('');

    const methods = useForm<FullFormValues>({
        resolver: zodResolver(getFullFormSchema(torneoType)),
        defaultValues: {
            nombreTorneo: "",
            organizacion: "",
            ubicacion: "",
            imagenBannerUrl: "",
            descripcion: "",
            fechaInicio: "",
            fechaFin: "",
            events: [],
            fechaInicioInscripciones: "",
            fechaCierreInscripciones: "",
            fechaCierreDesafios: "",
            contactoNombre: "",
            contactoEmail: "",
            contactoTelefono: "",
            reglasLadder: {
                posicionesDesafioArriba: 3,
                posicionesDesafioAbajoPrimerPuesto: 5,
                posicionesDesafioArribaUltimoPuesto: 5,
            },
            tiempos: {
                tiempoLimiteAceptarDesafio: 48,
                tiempoLimiteJugarPartido: 7,
                fechaCierreDesafios: "",
            },
            maximoInscripciones: undefined,
            tiempoLimiteAceptarDesafio: 48,
            tiempoLimiteJugarPartido: 7,
        },
    });

    const watchedTorneoType = useWatch({ control: methods.control, name: 'tipoTorneo' });

    useEffect(() => {
        if (watchedTorneoType) {
            setTorneoType(watchedTorneoType);
        }
    }, [watchedTorneoType]);
    

    const handleNext = async () => {
        let schema;
        const isLadder = methods.getValues("tipoTorneo") === 'Evento tipo Escalera';

        switch(currentStep) {
            case 0: schema = step0Schema; break;
            case 1: schema = step1Schema; break;
            case 2: schema = isLadder ? step2LadderSchema : step2KeyedSchema; break;
            case 3: schema = isLadder ? step3LadderSchema : step4Schema; break;
            case 4: schema = isLadder ? step4Schema : z.object({}); break; // Step 4 is last for keyed
            default: schema = z.object({});
        }

        const result = await schema.safeParseAsync(methods.getValues());
        
        methods.clearErrors();

        if (!result.success) {
             result.error.errors.forEach((err) => {
                methods.setError(err.path.join('.') as any, {
                    type: 'manual',
                    message: err.message,
                });
            });
            console.log(result.error.flatten());
            return;
        }

        const finalStep = isLadder ? 5 : 4;
        if (currentStep < finalStep) {
             setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    async function onSubmit(values: FullFormValues) {
        setSubmitLoading(true);
        if (!user) {
            toast({ variant: "destructive", title: "Error de autenticación" });
            setSubmitLoading(false);
            return;
        }

        try {
            const { events, ...tournamentData } = values;
            const newTournamentDocRef = doc(collection(db, "tournaments"));
            const batch = writeBatch(db);
            
            const fullTournamentData = { ...tournamentData };
            if (values.tipoTorneo === 'Evento tipo Escalera') {
                 fullTournamentData.tiempos = {
                    tiempoLimiteAceptarDesafio: values.tiempoLimiteAceptarDesafio!,
                    tiempoLimiteJugarPartido: values.tiempoLimiteJugarPartido!,
                    fechaCierreDesafios: values.fechaCierreDesafios!
                }
            }


            const tournamentPayload: Omit<Tournament, 'id'> = {
                ...fullTournamentData,
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
            
            toast({ title: "¡Torneo Creado!", description: "El torneo ha sido creado exitosamente." });
            router.push('/dashboard/tournaments');

        } catch (error) {
            console.error("Error al procesar el torneo: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el torneo." });
        } finally {
            setSubmitLoading(false);
        }
    }
    
    const isLadder = methods.getValues("tipoTorneo") === 'Evento tipo Escalera';
    const finalStep = isLadder ? 5 : 4;

    const steps = [
        <TournamentStep0Type key="step0" />,
        <TournamentStep1Details key="step1" />,
        isLadder ? <TournamentStep2LadderEvents key="step2L" /> : <TournamentStep2Events key="step2K" />,
        isLadder ? <TournamentStep3LadderRules key="step3L" /> : <TournamentStep4Timing key="step3K" isLadder={false}/>,
        isLadder ? <TournamentStep4Timing key="step4L" isLadder={true} /> : <TournamentStep5Summary key="step4K" />,
        isLadder ? <TournamentStep5Summary key="step5L" /> : null,
    ].filter(Boolean);
    

    return (
        <FormProvider {...methods}>
            <Progress value={(currentStep / finalStep) * 100} className="mb-6" />
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
                        
                        {steps[currentStep]}

                        <div className="flex justify-between gap-4 pt-4">
                            {currentStep > 0 && (
                                <Button type="button" variant="outline" onClick={handlePrevious}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                            )}
                            <div className="flex-grow"></div>
                            {currentStep < finalStep && (
                                <Button type="button" onClick={handleNext}>
                                    Siguiente
                                </Button>
                            )}
                            {currentStep === finalStep && (
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

