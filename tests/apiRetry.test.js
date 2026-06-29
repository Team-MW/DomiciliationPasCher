// tests/apiRetry.test.js
/**
 * Test that fetchWithRetry correctly retries on HTTP 429 responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry } from '../src/utils/api';

// Mock global fetch with vitest
global.fetch = vi.fn();

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries on 429 and eventually resolves', async () => {
    // First two calls return 429, third returns 200
    const mockResponses = [
      { status: 429, headers: new Headers({ 'Retry-After': '0' }) },
      { status: 429, headers: new Headers({}) },
      { status: 200, headers: new Headers({}), json: async () => ({ success: true }) },
    ];
    let callCount = 0;
    fetch.mockImplementation(() => {
      const resp = mockResponses[callCount] || mockResponses[mockResponses.length - 1];
      callCount++;
      return Promise.resolve({
        status: resp.status,
        headers: resp.headers,
        json: resp.json || (() => Promise.resolve({})),
      });
    });

    const response = await fetchWithRetry('https://example.com/api', {}, 5, 10);
    const data = await response.json();
    expect(data).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  }, 10000);
});
