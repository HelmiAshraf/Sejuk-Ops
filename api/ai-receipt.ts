import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { AI_MODEL } from './_config.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const RECEIPT_PROMPT = `You are a payment receipt reading assistant for a field service company in Malaysia.
Extract the payment details from the receipt and return a short, clean summary suitable for an accountant's record.
Format it like this (skip any line if info is not found):

Status: <status>
Amount: <amount>
Date: <date>
Reference: <reference number>
Recipient: <recipient name>
Account: <account number>
Bank: <bank name>

Replace each placeholder with the actual value from the receipt. Only output the lines above. No extra explanation.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileUrl, fileType } = req.body ?? {};
  if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });

  try {
    const isPdf = fileUrl.match(/\.pdf($|\?)/i) || fileType === 'application/pdf';
    const mimeType: string = isPdf ? 'application/pdf' : (fileType ?? 'image/jpeg');

    // Fetch the file and encode as base64 so the model actually sees the content
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) return res.status(502).json({ error: 'Could not fetch receipt file' });
    const buffer = Buffer.from(await fileResp.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionUserMessageParam['content'] = isPdf
      ? [
          // GPT-4o document understanding — passes the actual PDF bytes
          { type: 'file', file: { filename: 'receipt.pdf', file_data: dataUri } } as any,
          { type: 'text', text: 'Extract the payment details from this receipt.' },
        ]
      : [
          { type: 'image_url', image_url: { url: dataUri } },
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
