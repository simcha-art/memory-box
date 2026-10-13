import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, downloadFile, jsonBody, request } from './client';

function response(status: number, payload: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(payload),
    blob: vi.fn().mockResolvedValue(new Blob(['file'])),
  };
}

describe('API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sends bearer auth and JSON content type for JSON request bodies', async () => {
    localStorage.setItem('memorybox-token', 'session-token');
    const fetchMock = vi.fn().mockResolvedValue(response(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('/items', { method: 'POST', body: jsonBody({ title: 'Test' }) }))
      .resolves.toEqual({ ok: true });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer session-token');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('uses the local API URL by default for login requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, { token: 'token' }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/auth/login', {
      method: 'POST',
      body: jsonBody({ email: 'ada@example.com', password: 'secret' }),
    });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/auth/login');
  });

  it('does not override content type for multipart requests and handles empty responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(204));
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('title', 'Test');

    await expect(request('/items', { method: 'POST', body: form })).resolves.toBeUndefined();
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Content-Type')).toBe(false);
  });

  it('exposes API errors and uses a fallback for malformed error responses', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response(400, { error: 'Invalid input' }))
      .mockResolvedValueOnce({
        ...response(500),
        json: vi.fn().mockRejectedValue(new Error('bad JSON')),
      }));

    await expect(request('/items')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Invalid input',
      status: 400,
    } satisfies Partial<ApiError>);
    await expect(request('/items')).rejects.toMatchObject({
      message: 'Something went wrong',
      status: 500,
    });
  });

  it('downloads files using the current auth token', async () => {
    localStorage.setItem('memorybox-token', 'download-token');
    const fetchMock = vi.fn().mockResolvedValue(response(200));
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn().mockReturnValue('blob:download');
    const revokeObjectURL = vi.fn();
    const BrowserUrl = URL;
    vi.stubGlobal('URL', Object.assign(class extends BrowserUrl {}, {
      createObjectURL,
      revokeObjectURL,
    }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadFile('/items/file', 'saved.pdf');

    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer download-token');
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.contexts[0]).toMatchObject({ download: 'saved.pdf' });
  });
});
