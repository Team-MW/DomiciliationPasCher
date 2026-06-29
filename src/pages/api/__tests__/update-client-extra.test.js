// src/pages/api/__tests__/update-client-extra.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies BEFORE importing handler
vi.mock('../../../services/adminDataService', () => ({
  adminDataService: {
    updateClientExtraInfo: vi.fn()
  }
}));

vi.mock('../../../utils/updateMutex', () => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn()
}));

import handler from '../update-client-extra.js';
import { adminDataService } from '../../../services/adminDataService';
import { acquireLock, releaseLock } from '../../../utils/updateMutex';

// Helper to create mock req/res objects that mimic Express/Node style
function makeMockRes() {
  const res = {
    statusCode: null,
    _body: null,
    _headers: {},
    status(code) { this.statusCode = code; return this; },
    json(obj) { this._body = obj; return this; },
    setHeader(k, v) { this._headers[k] = v; },
    end(data) { this._body = typeof data === 'string' ? JSON.parse(data) : data; }
  };
  return res;
}

describe('update-client-extra API handler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const req = { method: 'GET', body: {} };
    const res = makeMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res._body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 400 when clientId is missing', async () => {
    const req = { method: 'POST', body: { extraInfo: { foo: 'bar' } } };
    const res = makeMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when extraInfo is missing', async () => {
    const req = { method: 'POST', body: { clientId: '123' } };
    const res = makeMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 429 when lock is already acquired', async () => {
    acquireLock.mockReturnValue(false);
    const req = { method: 'POST', body: { clientId: '123', extraInfo: { foo: 'bar' } } };
    const res = makeMockRes();
    await handler(req, res);
    expect(res.statusCode).toBe(429);
    expect(res._body).toEqual({ error: 'Update already in progress' });
    expect(releaseLock).not.toHaveBeenCalled();
  });

  it('returns 200 on successful update', async () => {
    acquireLock.mockReturnValue(true);
    const mockResult = { id: '123', foo: 'bar' };
    adminDataService.updateClientExtraInfo.mockResolvedValue(mockResult);

    const req = { method: 'POST', body: { clientId: '123', extraInfo: { foo: 'bar' } } };
    const res = makeMockRes();
    await handler(req, res);

    expect(acquireLock).toHaveBeenCalledTimes(1);
    expect(adminDataService.updateClientExtraInfo).toHaveBeenCalledWith('123', { foo: 'bar' });
    expect(res.statusCode).toBe(200);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 rate-limit errors and succeeds on 3rd attempt', async () => {
    acquireLock.mockReturnValue(true);
    const rateLimitErr = new Error('HTTP 429: rate limit exceeded');
    adminDataService.updateClientExtraInfo
      .mockRejectedValueOnce(rateLimitErr)
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce({ id: '999', success: true });

    const req = { method: 'POST', body: { clientId: '999', extraInfo: { a: 1 } } };
    const res = makeMockRes();
    await handler(req, res);

    expect(adminDataService.updateClientExtraInfo).toHaveBeenCalledTimes(3);
    expect(res.statusCode).toBe(200);
    expect(releaseLock).toHaveBeenCalledTimes(1);
  });

  it('strips contractSignatureUrl from extraInfo before saving', async () => {
    acquireLock.mockReturnValue(true);
    adminDataService.updateClientExtraInfo.mockResolvedValue({ id: '1' });

    const req = {
      method: 'POST',
      body: {
        clientId: '1',
        extraInfo: {
          contractSigned: true,
          contractSignatureUrl: 'data:image/png;base64,VERYLONGSTRING'
        }
      }
    };
    const res = makeMockRes();
    await handler(req, res);

    // The handler should strip contractSignatureUrl before calling updateClientExtraInfo
    const callArg = adminDataService.updateClientExtraInfo.mock.calls[0][1];
    expect(callArg.contractSignatureUrl).toBeUndefined();
    expect(callArg.contractSigned).toBe(true);
  });
});
