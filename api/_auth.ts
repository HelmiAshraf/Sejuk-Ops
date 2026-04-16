import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Checks that the request carries the correct x-api-key header.
 * Returns true if valid, false + sends 401 if not.
 */
export function checkApiKey(req: VercelRequest, res: VercelResponse): boolean {
  const secret = process.env.APP_PASSWORD;
  if (!secret) return true; // not configured — allow (dev fallback)

  const key = req.headers['x-api-key'];
  if (key !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
