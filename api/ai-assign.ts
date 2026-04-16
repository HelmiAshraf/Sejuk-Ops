/**
 * AI Technician Assignment — /api/ai-assign
 *
 * Takes an order + list of available technicians (with distance & workload)
 * and returns an AI-generated recommendation explaining which technician
 * should be assigned and why.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface TechPayload {
  id: string;
  name: string;
  workStatus: 'Idle' | 'On the way' | 'On-site';
  activeOrders: number;
  distanceKm: number | null;
}

interface OrderPayload {
  order_no: string;
  customer_name: string;
  customer_address: string;
  service_type: string;
  problem_description: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { order, technicians } = req.body as {
    order: OrderPayload;
    technicians: TechPayload[];
  };

  if (!order || !Array.isArray(technicians) || technicians.length === 0) {
    return res.status(400).json({ error: 'order and technicians are required' });
  }

  const techLines = technicians
    .map((t, i) => {
      const dist = t.distanceKm != null ? `${t.distanceKm.toFixed(1)} km from order` : 'distance unknown';
      const jobs =
        t.activeOrders === 0
          ? 'no active jobs'
          : `${t.activeOrders} active job${t.activeOrders > 1 ? 's' : ''}`;
      return `${i + 1}. ${t.name} — Status: ${t.workStatus} (${jobs}) — Distance: ${dist}`;
    })
    .join('\n');

  const prompt = `You are an operations supervisor for an AC service company in Klang Valley, Malaysia.
Recommend the best technician for this service order.

ORDER DETAILS
Order No : ${order.order_no}
Customer : ${order.customer_name}
Address  : ${order.customer_address}
Service  : ${order.service_type}
Problem  : ${order.problem_description || 'Not specified'}

AVAILABLE TECHNICIANS
${techLines}

STATUS GUIDE
- Idle       = no active jobs (highest availability — strongly prefer)
- On the way = has an Assigned job but not started yet (medium availability)
- On-site    = currently working at another customer (least preferred)

Give a concise 2–3 sentence recommendation explaining your choice.
Consider distance, current workload, and service type fit.
End your response with exactly: **Recommended: [full name]**`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      max_tokens: 250,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = completion.choices[0].message.content ?? '';

    // Extract the recommended name from the bolded footer
    const match = answer.match(/\*\*Recommended:\s*([^*\n]+)\*\*/i);
    const recommendedName = match ? match[1].trim() : null;

    return res.status(200).json({ answer, recommendedName });
  } catch (err) {
    console.error('[ai-assign] error:', err);
    return res.status(500).json({ error: 'AI recommendation failed. Please try again.' });
  }
}
