'use server';

/**
 * @fileOverview A tournament settings suggestion AI agent.
 *
 * - suggestTournamentSettings - A function that validates tournament configurations and suggests improvements.
 * - SuggestTournamentSettingsInput - The input type for the suggestTournamentSettings function.
 * - SuggestTournamentSettingsOutput - The return type for the suggestTournamentSettings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTournamentSettingsInputSchema = z.object({
  tournamentName: z.string().describe('El nombre del torneo.'),
  startDate: z.string().describe('La fecha de inicio del torneo (YYYY-MM-DD).'),
  endDate: z.string().describe('La fecha de finalización del torneo (YYYY-MM-DD).'),
  location: z.string().describe('El lugar donde se celebrará el torneo.'),
  format: z.enum(['Eliminación Simple', 'Doble Eliminación', 'Round Robin']).describe('El formato del torneo.'),
  numberOfPlayers: z.number().int().positive().describe('El número de jugadores que participan en el torneo.'),
  entryFee: z.number().min(0).describe('La cuota de inscripción para el torneo.'),
  prizePoolDistribution: z.string().describe('Detalles sobre cómo se distribuirá el pozo de premios entre los ganadores.'),
  rules: z.string().describe('Una descripción de las reglas.'),
});
export type SuggestTournamentSettingsInput = z.infer<typeof SuggestTournamentSettingsInputSchema>;

const SuggestTournamentSettingsOutputSchema = z.object({
  isValid: z.boolean().describe('Si la configuración del torneo es válida y equilibrada.'),
  suggestions: z.array(z.string()).describe('Sugerencias para mejorar la configuración del torneo, si las hay.'),
  reason: z.string().describe('El razonamiento detrás de la validez y las sugerencias.'),
});
export type SuggestTournamentSettingsOutput = z.infer<typeof SuggestTournamentSettingsOutputSchema>;

export async function suggestTournamentSettings(input: SuggestTournamentSettingsInput): Promise<SuggestTournamentSettingsOutput> {
  return suggestTournamentSettingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTournamentSettingsPrompt',
  input: {schema: SuggestTournamentSettingsInputSchema},
  output: {schema: SuggestTournamentSettingsOutputSchema},
  prompt: `Eres un asistente de IA especializado en validar configuraciones de torneos y proporcionar sugerencias de mejora.

  Analiza la siguiente configuración de torneo para determinar si es válida y equilibrada.
  Proporciona sugerencias para mejorar la configuración del torneo si hay alguna configuración incorrecta o desequilibrio.

  Nombre del Torneo: {{{tournamentName}}}
  Fecha de Inicio: {{{startDate}}}
  Fecha de Finalización: {{{endDate}}}
  Ubicación: {{{location}}}
  Formato: {{{format}}}
  Número de Jugadores: {{{numberOfPlayers}}}
  Cuota de Inscripción: {{{entryFee}}}
  Distribución del Pozo de Premios: {{{prizePoolDistribution}}}
  Reglas: {{{rules}}}

  Responde con un objeto JSON que contenga las siguientes claves:
  - isValid (boolean): Si la configuración del torneo es válida y equilibrada.
  - suggestions (array de strings): Sugerencias para mejorar la configuración del torneo, si las hay.
  - reason (string): El razonamiento detrás de la validez y las sugerencias.

  Asegúrate de que el campo isValid refleje con precisión si la configuración del torneo es razonable dada la información proporcionada.
  Si la configuración parece defectuosa, explica por qué y proporciona sugerencias específicas.
  `,
});

const suggestTournamentSettingsFlow = ai.defineFlow(
  {
    name: 'suggestTournamentSettingsFlow',
    inputSchema: SuggestTournamentSettingsInputSchema,
    outputSchema: SuggestTournamentSettingsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
