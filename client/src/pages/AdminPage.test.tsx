import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listUsers, updateUser } from '../api/admin';
import { PreferencesProvider } from '../stores/PreferencesStore';
import { AdminPage } from './AdminPage';
import type { AdminUser } from '../types';

const workspaceMocks = vi.hoisted(() => ({
  setError: vi.fn(),
  setNotice: vi.fn(),
}));

vi.mock('../api/admin', () => ({
  deleteUser: vi.fn(),
  listUsers: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin' } }),
}));

vi.mock('../stores/WorkspaceStore', () => ({
  useWorkspace: () => workspaceMocks,
}));

const accounts: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    disabled: false,
    emailVerified: true,
    itemCount: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'pending-1',
    name: 'Pending User',
    email: 'pending@example.com',
    role: 'user',
    disabled: false,
    emailVerified: false,
    itemCount: 2,
    createdAt: '2026-10-02T00:00:00.000Z',
  },
];

describe('AdminPage', () => {
  beforeEach(() => {
    vi.mocked(listUsers).mockResolvedValue(accounts);
  });

  it('shows verification status and the unverified account count', async () => {
    render(<PreferencesProvider><AdminPage /></PreferencesProvider>);

    expect(await screen.findByText('Pending User')).toBeInTheDocument();
    expect(screen.getByText('Not verified')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Unverified emails').nextElementSibling).toHaveTextContent('1');
  });

  it('filters users and updates a user role', async () => {
    render(<PreferencesProvider><AdminPage /></PreferencesProvider>);
    await screen.findByText('Pending User');

    fireEvent.change(screen.getByRole('textbox', { name: /search by name or email/i }), {
      target: { value: 'pending@' },
    });
    expect(screen.getByText('Pending User')).toBeInTheDocument();
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();

    vi.mocked(updateUser).mockResolvedValue({ ...accounts[1], role: 'admin' });
    fireEvent.click(screen.getByRole('button', { name: 'Make admin' }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('pending-1', { role: 'admin' }));
    expect(workspaceMocks.setNotice).toHaveBeenCalledWith({
      kind: 'success',
      message: 'User updated',
    });
  });
});
