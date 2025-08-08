
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { format } from 'date-fns';

export default function TournamentStep5Summary() {
  const { control } = useFormContext();
  const values = useWatch({ control });
  const { tipoTorneo, events } = values;
  
  const isLadder = tipoTorneo === 'Evento tipo Escalera';
  const stepNumber = isLadder ? 5 : 4;


  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), 'dd/MM/yyyy');
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle>Paso {stepNumber}: Resumen y Confirmación</CardTitle>
        <CardDescription>Revisa toda la información antes de crear el torneo.</CardDescription>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Detalles Generales</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Nombre:</strong> {values.nombreTorneo}</p>
          <p><strong>Tipo:</strong> <Badge>{values.tipoTorneo}</Badge></p>
          <p><strong>Organización:</strong> {values.organizacion}</p>
          <p><strong>Ubicación:</strong> {values.ubicacion}</p>
          <p><strong>Fechas del Torneo:</strong> {formatDate(values.fechaInicio)} - {formatDate(values.fechaFin)}</p>
          <p><strong>Descripción:</strong> {values.descripcion || "N/A"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Categorías / Divisiones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {events?.map((event: any, index: number) => (
            <div key={index}>
              <h4 className="font-semibold">{event.nombre}</h4>
              <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-3 gap-x-4">
                <p><strong>Formato:</strong> {event.formatoTorneo || (isLadder ? 'Escalera' : 'N/A')}</p>
                 <p><strong>Tipo:</strong> {event.tipoDeJuego}</p>
                 <p><strong>Sexo:</strong> {event.sexo}</p>
                 {event.tipoDeJuego === 'Singles' ? (
                     <p><strong>Rango ELO:</strong> {event.ELOminimo || 'N/A'} - {event.ELOmaximo || 'N/A'}</p>
                 ) : (
                    <p><strong>ELO Equipo:</strong> {event.ELOminimoEquipo || 'N/A'} - {event.ELOmaximoEquipo || 'N/A'}</p>
                 )}
                <p><strong>Tarifa:</strong> ${event.tarifaInscripcion}</p>
                {isLadder && <p><strong>Índice Playoff:</strong> {event.valorIndiceClasificacion}</p>}
              </div>
              {index < events.length - 1 && <Separator className="mt-4"/>}
            </div>
          ))}
        </CardContent>
      </Card>
      
      {isLadder && (
        <Card>
            <CardHeader><CardTitle className="text-lg">Reglas de Escalera</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p><strong>Orden Inicial:</strong> {values.metodoOrdenInicial}</p>
                <p><strong>Formato de Score:</strong> {values.formatoScore}</p>
                <p><strong>Reglas de Desafío:</strong> Arriba ({values.reglasLadder?.posicionesDesafioArriba}), 1er Puesto ({values.reglasLadder?.posicionesDesafioAbajoPrimerPuesto}), Último Puesto ({values.reglasLadder?.posicionesDesafioArribaUltimoPuesto})</p>
            </CardContent>
        </Card>
      )}

       <Card>
        <CardHeader><CardTitle className="text-lg">Registro y Contacto</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Período de Inscripción:</strong> {formatDateTime(values.fechaInicioInscripciones)} - {formatDateTime(values.fechaCierreInscripciones)}</p>
          {isLadder && <p><strong>Cierre de Desafíos:</strong> {formatDateTime(values.fechaCierreDesafios)}</p>}
          <p><strong>Límite de Inscripciones:</strong> {values.maximoInscripciones || 'Sin límite'}</p>
          <p><strong>Nombre de Contacto:</strong> {values.contactoNombre}</p>
          <p><strong>Email de Contacto:</strong> {values.contactoEmail}</p>
          <p><strong>Teléfono de Contacto:</strong> {values.contactoTelefono || "N/A"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
