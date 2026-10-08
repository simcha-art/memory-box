// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './features/auth/AuthContext';
import { App } from './App';

const fetchMock = vi.fn();

function renderApp() {
  return render(<BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>);
}

afterEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('MemoryBox client', () => {
  it('shows sign-in and allows switching to account creation', async () => {
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /create an account/i }));
    expect(screen.getByRole('heading', { name: /make room for less forgetting/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
  });

  it('persists language, direction, and theme preferences', async () => {
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    await screen.findByRole('heading', { name: /welcome back/i });
    fireEvent.click(screen.getByRole('button', { name: /language/i }));
    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem('memorybox-locale')).toBe('he');

    fireEvent.click(screen.getByRole('button', { name: /מעבר למצב כהה/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('memorybox-theme')).toBe('dark');
  });

  it('opens the new-item form from the saved-items workspace', async () => {
    localStorage.setItem('memorybox-token', 'valid-token');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/auth/me')) return Response.json({ user: { id: 'u1', name: 'Alex', email: 'a@example.com' } });
      if (String(url).endsWith('/items')) return Response.json({ items: [] });
      if (String(url).endsWith('/reminders')) return Response.json({ reminders: [] });
      if (String(url).endsWith('/categories')) return Response.json({ categories: [] });
      return Response.json({});
    });
    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: /add to box/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
