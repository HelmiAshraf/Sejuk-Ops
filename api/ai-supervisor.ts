import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { AI_MODEL } from './_config.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPERVISOR_PROMPT = `You are an AI workflow supervisor for a field service operations system.
You will be given details of a completed job. Identify any potential issues.

Check for:
1. Price mismatch — final amount is 50%+ higher than quoted price
2. No photos — job is marked done but no photos were uploaded
3. Fast completion — job was completed in under 15 minutes

For each issue found, state it clearly with a short explanation.
If no issues found, say "Job looks good. No issues detected."
Be concise. Use bullet points for issues.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId } = req.body ?? {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });

  try {
    const [orderRes, completionRes, photosRes, auditRes] = await Promise.all([
      supabase.from('orders').select('*, technicians(name)').eq('id', orderId).single(),
      supabase.from('job_completions').select('*').eq('order_id', orderId).maybeSingle(),
      supabase.from('job_photos').select('id').eq('order_id', orderId),
      supabase.from('audit_logs').select('action, created_at').eq('order_id', orderId)
        .in('to_status', ['In Progress', 'Job Done']).order('created_at'),
    ]);

    const order = orderRes.data;
    const completion = completionRes.data;
    if (!order || !completion) return res.status(404).json({ error: 'Order or completion not found' });

    const auditLogs = auditRes.data ?? [];
    const startLog = auditLogs.find(l => l.action === 'STATUS_CHANGED');
    const doneLog = auditLogs[auditLogs.length - 1];
    let minutesToComplete: number | null = null;
    if (startLog && doneLog && startLog !== doneLog) {
      minutesToComplete = Math.round(
        (new Date(doneLog.created_at).getTime() - new Date(startLog.created_at).getTime()) / 60000
      );
    }

    const jobData = {
      order_no: order.order_no,
      service_type: order.service_type,
      technician: (order.technicians as any)?.name,
      quoted_price: order.quoted_price,
      final_amount: completion.final_amount,
      extra_charges: completion.extra_charges,
      photo_count: photosRes.data?.length ?? 0,
      minutes_to_complete: minutesToComplete,
      work_done: completion.work_done,
    };

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 400,
      temperature: 0,
      messages: [
        { role: 'system', content: SUPERVISOR_PROMPT },
        { role: 'user', content: `Review this job:\n${JSON.stringify(jobData, null, 2)}` },
      ],
    });

    return res.status(200).json({ answer: response.choices[0].message.content ?? '' });
  } catch (err) {
    console.error('Supervisor error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
