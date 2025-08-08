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
  tournamentName: z.string().describe('The name of the tournament.'),
  startDate: z.string().describe('The start date of the tournament (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date of the tournament (YYYY-MM-DD).'),
  location: z.string().describe('The location where the tournament will be held.'),
  format: z.enum(['Single Elimination', 'Double Elimination', 'Round Robin']).describe('The format of the tournament.'),
  numberOfPlayers: z.number().int().positive().describe('The number of players participating in the tournament.'),
  entryFee: z.number().min(0).describe('The entry fee for the tournament.'),
  prizePoolDistribution: z.string().describe('Details on how the prize pool will be distributed among the winners.'),
  rules: z.string().describe('A description of the rules.'),
});
export type SuggestTournamentSettingsInput = z.infer<typeof SuggestTournamentSettingsInputSchema>;

const SuggestTournamentSettingsOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the tournament configuration is valid and balanced.'),
  suggestions: z.array(z.string()).describe('Suggestions to improve the tournament setup, if any.'),
  reason: z.string().describe('The reasoning behind the validity and suggestions.'),
});
export type SuggestTournamentSettingsOutput = z.infer<typeof SuggestTournamentSettingsOutputSchema>;

export async function suggestTournamentSettings(input: SuggestTournamentSettingsInput): Promise<SuggestTournamentSettingsOutput> {
  return suggestTournamentSettingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTournamentSettingsPrompt',
  input: {schema: SuggestTournamentSettingsInputSchema},
  output: {schema: SuggestTournamentSettingsOutputSchema},
  prompt: `You are an AI assistant specialized in validating tournament configurations and providing suggestions for improvement.

  Analyze the following tournament settings to determine if they are valid and balanced.
  Provide suggestions to improve the tournament setup if there are any misconfigurations or imbalances.

  Tournament Name: {{{tournamentName}}}
  Start Date: {{{startDate}}}
  End Date: {{{endDate}}}
  Location: {{{location}}}
  Format: {{{format}}}
  Number of Players: {{{numberOfPlayers}}}
  Entry Fee: {{{entryFee}}}
  Prize Pool Distribution: {{{prizePoolDistribution}}}
  Rules: {{{rules}}}

  Respond with a JSON object that contains the following keys:
  - isValid (boolean): Whether the tournament configuration is valid and balanced.
  - suggestions (array of strings): Suggestions to improve the tournament setup, if any.
  - reason (string): The reasoning behind the validity and suggestions.

  Ensure that the isValid field accurately reflects whether the tournament setup is reasonable given the provided information.
  If the setup appears flawed, explain why and provide specific suggestions.
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
