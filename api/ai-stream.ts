/**
 * AI Streaming Query — /api/ai-stream
 *
 * Same architecture as ai-query.ts but streams the final answer
 * back to the client using Server-Sent Events (SSE).
 *
 * Flow:
 *  1. Guardrails check
 *  2. Function calling (non-streaming) — run DB query
 *  3. Stream final answer word-by-word via SSE
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import {
  AI_MODEL, AI_MAX_TOKENS, AI_TEMPERATURE,
  AI_INPUT_MAX_CHARS, AI_INPUT_BLOCKED_TERMS, AI_MEMORY_WINDOW,
} from './_config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DB_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: 'function', function: { name: 'query_jobs_by_technician', description: 'Get completed jobs for a specific technician', parameters: { type: 'object', properties: { technician_name: { type: 'string' }, days_ago: { type: 'number' } }, required: ['technician_name'] } } },
  { type: 'function', function: { name: 'query_top_technician', description: 'Find the technician with the most completed jobs', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_week', 'this_month'] } }, required: ['period'] } } },
  { type: 'function', function: { name: 'query_jobs_count', description: 'Count total jobs completed in a period', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_week', 'this_month'] } }, required: ['period'] } } },
  { type: 'function', function: { name: 'query_jobs_no_photos', description: 'Find completed jobs with no photos', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'query_revenue', description: 'Get total revenue for a period', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['today', 'this_week', 'this_month'] } }, required: ['period'] } } },
  { type: 'function', function: { name: 'query_overloaded_technician', description: 'Identify overloaded technicians', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['this_week', 'this_month'] } }, required: ['period'] } } },
];

const SYSTEM_PROMPT = `You are an AI operations assistant for Sejuk Sejuk Service Sdn Bhd.
Always call the appropriate function before answering. Only answer about service operations data.
Be concise. Use bullet points for lists. Format currency as "RM X.XX".`;

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const now = new Date();
  const periodStart = (p: string) => {
    const d = new Date(now);
    if (p === 'today') { d.setHours(0, 0, 0, 0); }
    else if (p === 'this_week') { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); }
    else if (p === 'this_month') { d.setDate(1); d.setHours(0, 0, 0, 0); }
    return d.toISOString();
  };

  switch (name) {
    case 'query_jobs_by_technician': {
      const since = new Date(now.getTime() - Number(args.days_ago ?? 7) * 86400000).toISOString();
      const { data } = await supabase.from('job_completions')
        .select('work_done, final_amount, completed_at, orders(order_no, service_type, customer_name), technicians(name)')
        .gte('completed_at', since).ilike('technicians.name' as any, `%${String(args.technician_name)}%`);
      return data ?? [];
    }
    case 'query_top_technician': {
      const { data } = await supabase.from('job_completions')
        .select('final_amount, technicians(name)').gte('completed_at', periodStart(args.period as string));
      const agg: Record<string, { name: string; count: number; revenue: number }> = {};
      for (const row of data ?? []) {
        const n = (row.technicians as any)?.name ?? 'Unknown';
        if (!agg[n]) agg[n] = { name: n, count: 0, revenue: 0 };
        agg[n].count++; agg[n].revenue += Number(row.final_amount ?? 0);
      }
      return Object.values(agg).sort((a, b) => b.count - a.count);
    }
    case 'query_jobs_count': {
      const { count } = await supabase.from('job_completions')
        .select('*', { count: 'exact', head: true }).gte('completed_at', periodStart(args.period as string));
      return { count: count ?? 0, period: args.period };
    }
    case 'query_jobs_no_photos': {
      const { data: photoIds } = await supabase.from('job_photos').select('order_id');
      const ids = (photoIds ?? []).map(r => r.order_id).filter(Boolean);
      let q = supabase.from('orders').select('order_no, customer_name, technician:technicians(name)').in('status', ['Job Done', 'Reviewed', 'Closed']);
      if (ids.length > 0) q = q.not('id', 'in', `(${ids.join(',')})`);
      const { data } = await q;
      return data ?? [];
    }
    case 'query_revenue': {
      const { data } = await supabase.from('job_completions').select('final_amount').gte('completed_at', periodStart(args.period as string));
      const total = (data ?? []).reduce((s, r) => s + Number(r.final_amount ?? 0), 0);
      return { total_revenue: total.toFixed(2), period: args.period, job_count: data?.length ?? 0 };
    }
    case 'query_overloaded_technician': {
      const { data } = await supabase.from('job_completions').select('technicians(name)').gte('completed_at', periodStart(args.period as string));
      const agg: Record<string, { name: string; count: number }> = {};
      for (const row of data ?? []) { const n = (row.technicians as any)?.name ?? 'Unknown'; if (!agg[n]) agg[n] = { name: n, count: 0 }; agg[n].count++; }
      const vals = Object.values(agg);
      return { technicians: vals, team_average: parseFloat((vals.reduce((s, v) => s + v.count, 0) / (vals.length || 1)).toFixed(1)) };
    }
    default: return { error: `Unknown tool: ${name}` };
  }
}

function sseWrite(res: VercelResponse, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, history = [] } = req.body ?? {};

  if (!question || typeof question !== 'string' || !question.trim())
    return res.status(400).json({ error: 'Question is required.' });
  if (question.length > AI_INPUT_MAX_CHARS)
    return res.status(400).json({ error: `Question must be under ${AI_INPUT_MAX_CHARS} characters.` });
  for (const term of AI_INPUT_BLOCKED_TERMS)
    if (question.toLowerCase().includes(term))
      return res.status(400).json({ error: 'That question cannot be processed.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const trimmedHistory = (history as OpenAI.Chat.Completions.ChatCompletionMessageParam[])
    .slice(-(AI_MEMORY_WINDOW * 2));

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmedHistory,
    { role: 'user', content: question },
  ];

  try {
    sseWrite(res, { type: 'status', message: 'Fetching data...' });

    // Step 1: Function call (non-streaming)
    const turn1 = await openai.chat.completions.create({
      model: AI_MODEL, max_tokens: 300, temperature: 0,
      tools: DB_TOOLS, tool_choice: 'auto', messages,
    });

    const choice = turn1.choices[0];
    let updatedMessages = [...messages];
    let toolName: string | null = null;

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      sseWrite(res, { type: 'status', message: 'Running query...' });

      // Execute ALL tool calls in parallel — OpenAI requires a result for every call_id
      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (tc) => {
          const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments ?? '{}'));
          return { id: tc.id, name: tc.function.name, result };
        })
      );

      toolName = toolResults[toolResults.length - 1].name;

      updatedMessages = [
        ...messages,
        choice.message,
        ...toolResults.map(t => ({
          role: 'tool' as const,
          tool_call_id: t.id,
          content: JSON.stringify(t.result),
        })),
      ];
    }

    // Step 2: Stream final answer
    sseWrite(res, { type: 'status', message: 'Generating answer...' });

    const stream = await openai.chat.completions.create({
      model: AI_MODEL, max_tokens: AI_MAX_TOKENS, temperature: AI_TEMPERATURE,
      messages: updatedMessages, stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) sseWrite(res, { type: 'delta', text: delta });
    }

    sseWrite(res, { type: 'done', toolUsed: toolName });
    res.end();

  } catch (err) {
    console.error('[ai-stream] error:', err);
    sseWrite(res, { type: 'error', message: 'The assistant encountered an error.' });
    res.end();
  }
}
