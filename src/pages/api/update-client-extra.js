// src/pages/api/update-client-extra.js
import { adminDataService } from '../../services/adminDataService';
import { acquireLock, releaseLock } from '../../utils/updateMutex';

/**
 * API route to safely update a client's extra_info with retry logic.
 * Called from the front-end when signing the contract.
 * NOTE: In dev, this is NOT used directly - vite.config.js handles /api/update-client-extra
 *       with inline Node.js DB logic to avoid import.meta.env issues.
 *       This file is used in production (Vercel serverless) and in unit tests.
 */
export default async function handler(req, res) {
  console.log('[API] /api/update-client-extra called, method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId, extraInfo } = req.body || {};

  if (!clientId || !extraInfo) {
    console.warn('[API] Missing parameters', { clientId, extraInfo });
    return res.status(400).json({ error: 'Missing parameters: clientId and extraInfo are required' });
  }

  if (!acquireLock()) {
    console.warn('[API] Update already in progress, rejecting');
    return res.status(429).json({ error: 'Update already in progress' });
  }

  try {
    // Strip large data-URLs that violate DB TEXT pattern constraints
    const cleanExtra = { ...extraInfo };
    delete cleanExtra.contractSignatureUrl;
    delete cleanExtra.contractSignedUrl;

    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const updated = await adminDataService.updateClientExtraInfo(clientId, cleanExtra);
        console.log('[API] Update successful on attempt', attempt);
        return res.status(200).json(updated);
      } catch (err) {
        console.error('[API] Update attempt', attempt, 'failed:', err.message);
        const isRateLimit = err.message && err.message.includes('429');
        if (!isRateLimit || attempt === maxAttempts) {
          return res.status(500).json({ error: err.message || 'Internal error' });
        }
        const delay = Math.pow(2, attempt) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } finally {
    releaseLock();
  }
}
