import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { AI_MODEL } from './_config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const DOC_PROMPT = `You are a document extraction assistant for a field service company.
Extract relevant service information from the uploaded document or image.
Return ONLY the "work done" description — a short summary of the service performed.
If you cannot determine what service was performed, return exactly: N/A
Keep it under 100 words.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileUrl, fileType } = req.body ?? {};
  if (!fileUrl) return res.status(400).json({ error: 'fileUrl is required' });

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = fileType?.startsWith('image/')
      ? [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: fileUrl } },
            { type: 'text', text: 'Extract the service description from this image.' },
          ],
        }]
      : [{
          role: 'user',
          content: `A service document was uploaded: ${fileUrl}\nExtract any service description visible.`,
        }];

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 200,
      temperature: 0,
      messages: [{ role: 'system', content: DOC_PROMPT }, ...messages],
    });

    return res.status(200).json({ answer: response.choices[0].message.content ?? 'N/A' });
  } catch (err) {
    console.error('Document extraction error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
