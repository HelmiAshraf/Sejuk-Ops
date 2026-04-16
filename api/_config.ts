/**
 * Server-side AI config (used by Vercel serverless functions).
 * Model is read from .env — everything else lives here.
 */

// Model comes from .env.local / Vercel env vars
export const AI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';
export const AI_MAX_TOKENS = 800;
export const AI_TEMPERATURE = 0.1;

export const AI_INPUT_MAX_CHARS = 500;
export const AI_INPUT_BLOCKED_TERMS = [
  'ignore',
  'jailbreak',
  'system prompt',
  'forget instructions',
];

export const AI_MEMORY_WINDOW = 8;
