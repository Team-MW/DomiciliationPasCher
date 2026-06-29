// src/utils/api.js
/**
 * fetchWithRetry – performs a fetch request with exponential back‑off handling HTTP 429.
 * @param {string} url - request URL
 * @param {RequestInit} options - fetch options
 * @param {number} retries - number of retry attempts (default 5)
 * @param {number} backoff - initial back‑off ms (default 500)
 * @returns {Promise<Response>} Resolves to the final Response (or throws after retries)
 */
export async function fetchWithRetry(url, options = {}, retries = 5, backoff = 500) {
  let attempt = 0;
  while (true) {
    const resp = await fetch(url, options);
    if (resp.status !== 429) return resp;
    if (attempt >= retries) {
      throw new Error(`fetchWithRetry: exceeded ${retries} retries for ${url}`);
    }
    // Use Retry‑After header if present, otherwise exponential back‑off
    const retryAfter = resp.headers.get('Retry-After');
    const wait = retryAfter ? Number(retryAfter) * 1000 : backoff * Math.pow(2, attempt);
    await new Promise(r => setTimeout(r, wait));
    attempt++;
  }
}
