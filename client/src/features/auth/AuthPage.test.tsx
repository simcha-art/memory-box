import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../stores/PreferencesStore';
import { AuthPage } from './AuthPage';

const authMocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  resendVerification: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => authMocks,
}));

describe('AuthPage registration', () => {
  it('checks matching passwords and offers verification resend after registration', async () => {
    authMocks.authenticate.mockResolvedValue('verification-sent');
    authMocks.resendVerification.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <PreferencesProvider><AuthPage mode="register" /></PreferencesProvider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password-123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument();
    expect(authMocks.authenticate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(authMocks.authenticate).toHaveBeenCalledWith('register', {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password-123',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(authMocks.resendVerification).toHaveBeenCalledWith('ada@example.com');
  });
});
