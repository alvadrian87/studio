
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { format } from 'date-fns';

export default function TournamentStep4Summary() {
  const { control } = useFormContext();
  const values = useWatch({ control });
  const { tipoTorneo, events } = values;

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
        <CardTitle>Paso 4: Resumen y Confirmación</CardTitle>
        <CardDescription>Revisa toda la información antes de crear el torneo.</CardDescription>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Detalles Generales</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Nombre:</strong> {values.nombreTorneo}</p>
          <p><strong>Tipo:</strong> <Badge>{values.tipoTorneo}</Badge></p>
          <p><strong>Organización:</strong> {values.organizacion}</p>
          <p><strong>Ubicación:</strong> {values.ubicacion}</p>
          <p><strong>Fechas:</strong> {formatDate(values.fechaInicio)} - {formatDate(values.fechaFin)}</p>
          <p><strong>Descripción:</strong> {values.descripcion || "N/A"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">{tipoTorneo === 'Individual' ? 'Categorías' : 'Divisiones'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {events?.map((event: any, index: number) => (
            <div key={index}>
              <h4 className="font-semibold">{event.nombre}</h4>
              <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4">
                <p><strong>Formato:</strong> {event.formatoTorneo}</p>
                 {tipoTorneo === 'Individual' ? (
                    <>
                        <p><strong>Tipo:</strong> {event.tipoDeJuego}</p>
                        <p><strong>Sexo:</strong> {event.sexo}</p>
                        <p><strong>Rango ELO:</strong> {event.eloMinimo} - {event.eloMaximo}</p>
                        <p><strong>Tarifa:</strong> ${event.tarifaInscripcion}</p>
                    </>
                 ) : (
                    <>
                        <p><strong>Jugadores/Equipo:</strong> {event.numJugadoresPorEquipo}</p>
                        <p><strong>Ronda:</strong> {event.configuracionRonda}</p>
                        <p><strong>Rango ELO Equipo:</strong> {event.eloMinimoEquipo} - {event.eloMaximoEquipo}</p>
                        <p><strong>Tarifa/Equipo:</strong> ${event.tarifaInscripcionEquipo}</p>
                    </>
                 )}
              </div>
              {index < events.length - 1 && <Separator className="mt-4"/>}
            </div>
          ))}
        </CardContent>
      </Card>

       <Card>
        <CardHeader><CardTitle className="text-lg">Registro y Contacto</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Período de Inscripción:</strong> {formatDateTime(values.fechaInicioInscripciones)} - {formatDateTime(values.fechaCierreInscripciones)}</p>
          <p><strong>Límite de Inscripciones:</strong> {values.maximoInscripciones || 'Sin límite'}</p>
          <p><strong>Nombre de Contacto:</strong> {values.contactoNombre}</p>
          <p><strong>Email de Contacto:</strong> {values.contactoEmail}</p>
          <p><strong>Teléfono de Contacto:</strong> {values.contactoTelefono || "N/A"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
