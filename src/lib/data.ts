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

export const players: Player[] = [
  { id: '1', name: 'AceMaster', rank: 1, wins: 25, losses: 2, avatar: 'https://placehold.co/40x40.png' },
  { id: '2', name: 'SlamminSam', rank: 2, wins: 22, losses: 5, avatar: 'https://placehold.co/40x40.png' },
  { id: '3', name: 'RallyQueen', rank: 3, wins: 20, losses: 7, avatar: 'https://placehold.co/40x40.png' },
  { id: '4', name: 'VolleyPro', rank: 4, wins: 18, losses: 8, avatar: 'https://placehold.co/40x40.png' },
  { id: '5', name: 'BackhandBoss', rank: 5, wins: 15, losses: 10, avatar: 'https://placehold.co/40x40.png' },
  { id: '6', name: 'DropShotDiva', rank: 6, wins: 12, losses: 12, avatar: 'https://placehold.co/40x40.png' },
];

export const tournaments: Tournament[] = [
  { id: '1', name: 'Abierto de Verano', format: 'Eliminación Simple', location: 'Centro de Tenis de la Ciudad', status: 'En Curso', startDate: '2024-07-15' },
  { id: '2', name: 'Invitacional de Otoño', format: 'Round Robin', location: 'Canchas del Club de Campo', status: 'Próximo', startDate: '2024-09-01' },
  { id: '3', name: 'Grand Slam de Invierno', format: 'Doble Eliminación', location: 'Arena Cubierta', status: 'Completado', startDate: '2024-01-20' },
];

export const matches: Match[] = [
  { id: 'm1', player1: players[0], player2: players[2], winnerId: '1', status: 'Completado', date: '2024-07-20' },
  { id: 'm2', player1: players[1], player2: players[3], winnerId: null, status: 'En Progreso', date: '2024-07-21' },
  { id: 'm3', player1: players[4], player2: players[5], winnerId: null, status: 'Pendiente', date: '2024-07-22' },
  { id: 'm4', player1: players[0], player2: players[4], winnerId: '1', status: 'Completado', date: '2024-07-18' },
];

export const challenges = [
    { id: 'c1', from: players[1], to: players[0], status: 'Pendiente' },
    { id: 'c2', from: players[3], to: players[2], status: 'Aceptado' },
];
