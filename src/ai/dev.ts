
import { config } from 'dotenv';
config();

// Flows
import { registerMatchResult } from '@/ai/flows/register-match-result';
import '@/ai/flows/suggest-tournament-settings';

export { registerMatchResult };
