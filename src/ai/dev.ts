
import { config } from 'dotenv';
config();

// Initialize Firebase Admin first
import '../lib/firebase-admin';

import '@/ai/flows/suggest-tournament-settings.ts';
import { registerMatchResult } from '@/ai/flows/register-match-result.ts';

export { registerMatchResult };
