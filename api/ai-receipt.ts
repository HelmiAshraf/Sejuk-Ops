import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { AI_MODEL } from './_config.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const RECEIPT_PROMPT = `You are a payment receipt reading assistant for a field service company in Malaysia.
Extract the payment details from the receipt and return a short, clean summary suitable for an accountant's record.
Format it like this (skip any line if info is not found):

Status: Successful
Amount: RM 37.30
Date: 11 Apr 2026, 8:49 PM
Reference: 942291110Q
Recipient: CHAMP LEGACY
Account: 562405663190
Bank: Maybank

Only output the lines above. No extra explanation.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileUrl, fileType } = req.body ?? {};
  if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });

  try {
    const isPdf = fileUrl.match(/\.pdf($|\?)/i) || fileType === 'application/pdf';

    const userContent: OpenAI.Chat.Completions.ChatCompletionUserMessageParam['content'] = isPdf
      ? `A payment receipt PDF was uploaded: ${fileUrl}\nExtract the payment details.`
      : [
          { type: 'image_url', image_url: { url: fileUrl } },
          { type: 'text', text: 'Extract the payment details from this receipt.' },
        ];

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 200,
      temperature: 0,
      messages: [
        { role: 'system', content: RECEIPT_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const text = (response.choices[0].message.content ?? '').trim();
    return res.status(200).json({ text });
  } catch (err) {
    console.error('Receipt extraction error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
