

// Type definitions based on your data structure
export interface Player {
  id: string; // This will be the document's ID
  uid: string; // This is the user's UID from auth
  firstName: string;
  lastName: string;
  displayName: string; // Combination of first and last name
  email: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  residence: string;
  dominantHand?: string;
  club?: string;
  avatar?: string;
  role: 'player' | 'admin';
  globalWins: number;
  globalLosses: number;
  rankPoints: number;
  lesionado: boolean;
  fechaFinLesion?: string; // Timestamp
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  status: 'Pendiente' | 'Completado' | 'En Progreso';
  date: string;
  tournamentId: string;
  score: string | null;
  challengeId?: string; // To link back to the challenge for ladder logic
}

export interface Tournament {
  id: string;
  creatorId: string;
  status: 'Próximo' | 'En Curso' | 'Completado' | 'Borrador';
  // Step 1
  tipoTorneo: 'Evento por Llaves' | 'Evento tipo Escalera';
  nombreTorneo: string;
  descripcion?: string;
  organizacion: string;
  fechaInicio: string;
  fechaFin: string;
  ubicacion: string;
  imagenBannerUrl?: string;

  isRanked?: boolean;

  // Key-based tournament fields
  metodoOrdenInicial?: 'Ordenar por ELO' | 'Ordenar manualmente';
  formatoScore?: '2 Sets + Super Tiebreak' | '3 Sets Completos';
  reglasLadder?: {
    posicionesDesafioArriba: number;
    posicionesDesafioAbajoPrimerPuesto: number;
    posicionesDesafioArribaUltimoPuesto: number;
  };
  tiempos?: {
    tiempoLimiteAceptarDesafio: number; // en horas
    tiempoLimiteJugarPartido: number; // en días
    fechaCierreDesafios: string;
  };
  
  // Step 3 (shared)
  fechaInicioInscripciones: string;
  fechaCierreInscripciones: string;
  maximoInscripciones?: number;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono?: string;
}

// Represents both a category in an individual tournament and a division in a team tournament.
export interface TournamentEvent {
    id?: string;
    torneoId?: string;
    nombre: string;
    
    // Shared for Ladder
    valorIndiceClasificacion?: number;
    reglasEspecíficas?: string;

    // Key-based tournament fields
    formatoTorneo?: 'Single Elimination' | 'Round Robin' | 'First Match Backdraw' | 'Ladder';
    
    // Individual
    tipoDeJuego?: 'Singles' | 'Dobles';
    sexo?: 'Femenino' | 'Masculino' | 'Mixto' | 'Abierto';
    ELOminimo?: number;
    ELOmaximo?: number;
    tarifaInscripcion?: number;
    
    // Equipos
    numJugadoresPorEquipo?: number;
    configuracionRonda?: string;
    eloMinimoEquipo?: number;
    eloMaximoEquipo?: number;
    tarifaInscripcionEquipo?: number;
}


export interface Challenge {
    id: string;
    torneoId: string;
    eventoId: string;
    retadorId: string; // player or team id
    desafiadoId: string; // player or team id
    fechaDesafio: string;
    fechaLimiteAceptacion: string;
    fechaLimitePartido?: string;
    estado: 'Pendiente' | 'Aceptado' | 'Rechazado' | 'Jugado' | 'Walkover' | 'No Jugado' | 'Cancelado';
    resultadoId?: string;
    tournamentName: string; // denormalized
}

export interface Result {
    id: string;
    desafioId: string;
    ganadorId: string;
    perdedorId: string;
    scores: Array<{ set: number, scoreGanador: number, scorePerdedor: number, esTiebreak: boolean }>;
    fechaValidacionGanador?: string;
    fechaValidacionPerdedor?: string;
    validadoPorAdmin: boolean;
}


export interface Team {
  id: string;
  torneoId: string;
  eventoId: string;
  nombreEquipo: string;
  capitanId: string; // player uid
  jugadoresIds: string[]; // array of player uids
  eloPromedioEquipo: number;
}

export interface Inscription {
  id: string;
  torneoId: string;
  eventoId: string; // category or division
  jugadorId?: string; // for singles
  equipoId?: string; // for doubles
  fechaInscripcion: string;
  status: 'Confirmado' | 'En Espera';
  posicionInicial: number;
  posicionActual: number;
  indiceActividad: number;
  desafioPendienteId: string | null;
}
