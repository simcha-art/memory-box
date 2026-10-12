import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { request } from "../../api/client";
import type { MemoryUser } from "../../types";

type AuthResult = "authenticated" | "verification-sent";

type AuthValue = {
  user: MemoryUser | null;
  loading: boolean;
  authenticate: (
    mode: "login" | "register",
    values: Record<string, string>,
  ) => Promise<AuthResult>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MemoryUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("memorybox-token")) {
      setLoading(false);
      return;
    }
    request<{ user: MemoryUser }>("/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem("memorybox-token"))
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(
    mode: "login" | "register",
    values: Record<string, string>,
  ): Promise<AuthResult> {
    const result = await request<{ user: MemoryUser; token?: string }>(
      `/auth/${mode}`,
      {
        method: "POST",
        body: JSON.stringify(values),
      },
    );
    if (!result.token) return "verification-sent";
    localStorage.setItem("memorybox-token", result.token);
    setUser(result.user);
    return "authenticated";
  }

  async function verifyEmail(token: string) {
    const result = await request<{ user: MemoryUser; token: string }>(
      "/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
    );
    localStorage.setItem("memorybox-token", result.token);
    setUser(result.user);
  }

  async function resendVerification(email: string) {
    await request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  function logout() {
    localStorage.removeItem("memorybox-token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticate,
        verifyEmail,
        resendVerification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
