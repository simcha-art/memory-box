import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

function AuthProbe() {
  const { user, authenticate, verifyEmail, logout } = useAuth();
  const account = { id: 'user-1', name: 'Ada', email: 'ada@example.com', role: 'user' as const };

  return (
    <div>
      <span>{user?.name ?? 'Signed out'}</span>
      <button onClick={() => void authenticate('register', { name: account.name })}>Register</button>
      <button onClick={() => void verifyEmail('verification-token')}>Verify</button>
      <button onClick={logout}>Log out</button>
      <output>{account.id}</output>
    </div>
  );
}

describe('AuthContext', () => {
  it('keeps registration pending verification, authenticates after verification, and logs out', async () => {
    const account = { id: 'user-1', name: 'Ada', email: 'ada@example.com', role: 'user' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ user: account, requiresVerification: true }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ user: account, token: 'verified-token' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('memorybox-token')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await screen.findByText('Ada');
    expect(localStorage.getItem('memorybox-token')).toBe('verified-token');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('memorybox-token')).toBeNull();
  });

  it('restores the session from the saved token and clears an invalid token', async () => {
    localStorage.setItem('memorybox-token', 'expired-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Invalid token' }),
    }));

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    await waitFor(() => expect(localStorage.getItem('memorybox-token')).toBeNull());
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });
});
