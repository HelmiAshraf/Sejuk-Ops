/**
 * AI Configuration
 * All AI behaviour is controlled here — not in .env.
 * .env only stores credentials (API keys, DB URLs).
 */

// ─── Model ────────────────────────────────────────────────────────
// claude-sonnet-4-6  → best balance of speed, quality, and cost (recommended)
// claude-opus-4-6    → highest capability, higher cost
// claude-haiku-4-5-20251001 → fastest, cheapest (good for guardrail checks)
export const AI_MODEL = 'claude-sonnet-4-6';
export const AI_MAX_TOKENS = 800;
export const AI_TEMPERATURE = 0.1; // low = more deterministic for ops queries

// ─── Guardrails ───────────────────────────────────────────────────
export const AI_INPUT_MAX_CHARS = 500;
export const AI_INPUT_BLOCKED_TERMS = [
  'ignore',
  'jailbreak',
  'system prompt',
  'forget instructions',
];

// ─── Memory ───────────────────────────────────────────────────────
// Number of previous conversation turns passed as context.
// Each turn = 1 user + 1 assistant message.
// Higher = better context, more tokens used.
export const AI_MEMORY_WINDOW = 8;

// ─── Feature Flags ────────────────────────────────────────────────
export const AI_STREAMING_ENABLED = true;      // Stream AI responses word-by-word
export const AI_SUPERVISOR_ENABLED = true;     // Auto-flag issues on job completion
export const AI_DOCUMENT_EXTRACT_ENABLED = true; // Extract data from uploaded files
