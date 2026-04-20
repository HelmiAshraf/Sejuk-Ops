import {
  AI_STREAMING_ENABLED,
  AI_SUPERVISOR_ENABLED,
  AI_DOCUMENT_EXTRACT_ENABLED,
} from '../config/ai';

export interface AIQueryResponse {
  answer: string;
  toolUsed?: string | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Streaming query (uses SSE) ────────────────────────────────────────────────
// Returns an async generator that yields text deltas as they arrive.
export async function* queryAIStream(
  question: string,
  history: ConversationMessage[] = []
): AsyncGenerator<{ type: 'status' | 'delta' | 'done' | 'error'; text?: string; message?: string; toolUsed?: string | null }> {
  const streamingEnabled = AI_STREAMING_ENABLED;

  if (!streamingEnabled) {
    // Fallback: non-streaming
    const res = await queryAI(question, history);
    yield { type: 'delta', text: res.answer };
    yield { type: 'done', toolUsed: res.toolUsed };
    return;
  }

  const res = await fetch('/api/ai-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  });

  if (!res.ok || !res.body) {
    yield { type: 'error', message: 'Failed to connect to AI assistant.' };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        yield JSON.parse(raw);
      } catch {
        // malformed SSE line — skip
      }
    }
  }
}

// ── Non-streaming fallback ────────────────────────────────────────────────────
export async function queryAI(
  question: string,
  history: ConversationMessage[] = []
): Promise<AIQueryResponse> {
  const res = await fetch('/api/ai-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? 'AI query failed');
  }

  return res.json();
}

// ── Workflow Supervisor ───────────────────────────────────────────────────────
export async function runWorkflowSupervisor(orderId: string): Promise<AIQueryResponse> {
  if (!AI_SUPERVISOR_ENABLED) return { answer: '' };

  const res = await fetch('/api/ai-supervisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });

  if (!res.ok) throw new Error('Supervisor check failed');
  return res.json();
}

// ── Customer Notification ─────────────────────────────────────────────────────
export async function notifyCustomer(payload: {
  customerPhone: string;
  customerName: string;
  orderNo: string;
  serviceType: string;
  technicianName: string;
  type?: 'otw' | 'completed';
}): Promise<void> {
  await fetch('/api/notify-customer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // fire-and-forget — don't throw, notification is non-blocking
}

// ── Receipt / Payment Proof OCR ───────────────────────────────────────────────
export async function extractReceiptData(fileUrl: string, fileType?: string): Promise<string> {
  if (!AI_DOCUMENT_EXTRACT_ENABLED) return '';

  const res = await fetch('/api/ai-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrl, fileType }),
  });

  if (!res.ok) throw new Error('Receipt extraction failed');
  const data = await res.json();
  return data.text ?? '';
}

// ── Document Understanding ────────────────────────────────────────────────────
export async function extractDocumentData(
  fileUrl: string,
  fileType: string
): Promise<AIQueryResponse> {
  if (!AI_DOCUMENT_EXTRACT_ENABLED) return { answer: 'N/A' };

  const res = await fetch('/api/ai-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrl, fileType }),
  });

  if (!res.ok) throw new Error('Document extraction failed');
  return res.json();
}
