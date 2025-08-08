
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
import type { Tournament, TournamentEvent } from "@/types";

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
}).refine(data => !data.ELOmaximo || !data.ELOminimo || data.ELOmaximo >= data.ELOminimo, {
    message: "ELO máximo no puede ser menor que ELO mínimo.",
    path: ["ELOmaximo"],
});

const baseTournamentSchema = z.object({
    tipoTorneo: z.enum(['Evento por Llaves', 'Evento tipo Escalera'], { required_error: "Debes seleccionar un tipo de torneo." }),
    nombreTorneo: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    descripcion: z.string().optional(),
    organizacion: z.string().min(2, "La organización es requerida."),
    fechaInicio: z.string().min(1, "La fecha de inicio es requerida."),
    fechaFin: z.string().min(1, "La fecha de fin es requerida."),
    ubicacion: z.string().min(2, "La ubicación es requerida."),
    imagenBannerUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
    fechaInicioInscripciones: z.string().min(1, "Requerido"),
    fechaCierreInscripciones: z.string().min(1, "Requerido"),
    maximoInscripciones: z.coerce.number().optional(),
    contactoNombre: z.string().min(2, "Requerido"),
    contactoEmail: z.string().email("Email inválido."),
    contactoTelefono: z.string().optional(),
});

const KeyedTournamentSchema = baseTournamentSchema.extend({
    events: z.array(eventSchema).min(1, "Debes agregar al menos una categoría o división."),
}).refine(data => new Date(data.fechaFin) >= new Date(data.fechaInicio), {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["fechaFin"],
});

const LadderTournamentSchema = baseTournamentSchema.extend({
    metodoOrdenInicial: z.enum(['Ordenar por ELO', 'Ordenar manualmente']),
    events: z.array(ladderEventSchema).min(1, "Debes agregar al menos una categoría."),
    reglasLadder: z.object({
        posicionesDesafioArriba: z.coerce.number().int().positive(),
        posicionesDesafioAbajoPrimerPuesto: z.coerce.number().int().positive(),
        posicionesDesafioArribaUltimoPuesto: z.coerce.number().int().positive(),
    }),
    formatoScore: z.enum(['2 Sets + Super Tiebreak', '3 Sets Completos']),
    fechaCierreDesafios: z.string().optional(),
    tiempoLimiteAceptarDesafio: z.coerce.number().int().positive().optional(),
    tiempoLimiteJugarPartido: z.coerce.number().int().positive().optional(),
}).refine(data => new Date(data.fechaFin) >= new Date(data.fechaInicio), {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["fechaFin"],
});

type FullFormValues = z.infer<typeof KeyedTournamentSchema> | z.infer<typeof LadderTournamentSchema>;

export function TournamentForm() {
    const [currentStep, setCurrentStep] = useState(0);
    const [submitLoading, setSubmitLoading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [torneoType, setTorneoType] = useState('');

    const methods = useForm<FullFormValues>({
        resolver: async (data, context, options) => {
            const schema = data.tipoTorneo === 'Evento tipo Escalera' ? LadderTournamentSchema : KeyedTournamentSchema;
            return zodResolver(schema)(data, context, options);
        },
        defaultValues: {
            tipoTorneo: undefined,
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
            contactoNombre: "",
            contactoEmail: "",
            contactoTelefono: "",
            maximoInscripciones: undefined,
            metodoOrdenInicial: "Ordenar por ELO",
            formatoScore: undefined,
            reglasLadder: {
                posicionesDesafioArriba: 3,
                posicionesDesafioAbajoPrimerPuesto: 5,
                posicionesDesafioArribaUltimoPuesto: 5,
            },
            fechaCierreDesafios: "", 
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
    
    const isLadder = methods.getValues("tipoTorneo") === 'Evento tipo Escalera';
    const finalStep = isLadder ? 5 : 4;

    const handleNext = async () => {
        const fieldsByStep: Record<string, (keyof FullFormValues)[]> = {
            '0': ['tipoTorneo'],
            '1': ['nombreTorneo', 'organizacion', 'ubicacion', 'fechaInicio', 'fechaFin'],
            '2': ['events', 'metodoOrdenInicial'],
            '3': isLadder ? ['reglasLadder', 'formatoScore'] : ['fechaInicioInscripciones', 'fechaCierreInscripciones', 'contactoNombre', 'contactoEmail'],
            '4': isLadder ? ['fechaInicioInscripciones', 'fechaCierreInscripciones', 'contactoNombre', 'contactoEmail'] : [],
        };
    
        const fieldsToValidate = fieldsByStep[currentStep] || [];
        const result = await methods.trigger(fieldsToValidate);
    
        if (!result) {
            console.log("Validation failed", methods.formState.errors);
            return;
        }
    
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
            
            let fullTournamentData: any = { ...tournamentData };
            
            if (values.tipoTorneo === 'Evento tipo Escalera') {
                 fullTournamentData.tiempos = {
                    tiempoLimiteAceptarDesafio: values.tiempoLimiteAceptarDesafio || 48,
                    tiempoLimiteJugarPartido: values.tiempoLimiteJugarPartido || 7,
                    fechaCierreDesafios: values.fechaCierreDesafios || ""
                }
                // remove original fields
                delete fullTournamentData.tiempoLimiteAceptarDesafio;
                delete fullTournamentData.tiempoLimiteJugarPartido;
                delete fullTournamentData.fechaCierreDesafios;
            }

            // Clean up undefined values before sending to Firestore
            Object.keys(fullTournamentData).forEach(key => {
                if (fullTournamentData[key] === undefined) {
                    delete fullTournamentData[key];
                }
            });


            const tournamentPayload: Omit<Tournament, 'id'> = {
                ...fullTournamentData,
                creatorId: user.uid,
                status: 'Próximo',
            };
            batch.set(newTournamentDocRef, tournamentPayload as any);

            (events || []).forEach(event => {
                const newEventDocRef = doc(collection(db, "eventos"));
                const eventPayload: Omit<TournamentEvent, 'id' | 'torneoId'> = { ...event };
                 Object.keys(eventPayload).forEach(key => {
                    if ((eventPayload as any)[key] === undefined) {
                        delete (eventPayload as any)[key];
                    }
                });
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
