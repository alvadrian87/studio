export type Player = {
  id: string;
  name: string;
  rank: number;
  wins: number;
  losses: number;
  avatar: string;
};

export type Match = {
  id: string;
  player1: Player;
  player2: Player;
  winnerId: string | null;
  status: 'Pendiente' | 'Completado' | 'En Progreso';
  date: string;
};

export type Tournament = {
  id: string;
  name: string;
  format: 'Eliminación Simple' | 'Doble Eliminación' | 'Round Robin';
  location: string;
  status: 'Próximo' | 'En Curso' | 'Completado';
  startDate: string;
};

// Estos son datos de ejemplo. La aplicación ahora usará Firestore.
export const players: Player[] = [];
export const tournaments: Tournament[] = [];
export const matches: Match[] = [];
export const challenges: { id: string, from: Player, to: Player, status: string }[] = [];
