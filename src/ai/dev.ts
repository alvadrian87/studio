import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-tournament-settings.ts';
import { registerMatchResult } from '@/ai/flows/register-match-result.ts';

export { registerMatchResult };
