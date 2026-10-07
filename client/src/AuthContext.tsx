import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { request, type MemoryUser } from './api';

type AuthValue = {
  user: MemoryUser | null;
  loading: boolean;
  authenticate: (mode: 'login' | 'register', values: Record<string, string>) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MemoryUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('memorybox-token')) {
      setLoading(false);
      return;
    }
    request<{ user: MemoryUser }>('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem('memorybox-token'))
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(mode: 'login' | 'register', values: Record<string, string>) {
    const result = await request<{ user: MemoryUser; token: string }>(`/auth/${mode}`, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    localStorage.setItem('memorybox-token', result.token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem('memorybox-token');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, authenticate, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
