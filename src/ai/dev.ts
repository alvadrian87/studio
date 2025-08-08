
import { config } from 'dotenv';
config();

// No separate admin initialization needed. Genkit handles it.

import '@/ai/flows/suggest-tournament-settings.ts';
import { registerMatchResult } from '@/ai/flows/register-match-result.ts';

export { registerMatchResult };
