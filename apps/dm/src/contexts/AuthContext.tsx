import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_BASE = 'http://localhost:8000/api';

interface Session {
  token: string;
  role: string;
  created_at: number;
  last_seen: number;
  campaign_id: string | null;
  pin_set: boolean;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  pinSet: boolean;
  login: (pin: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinSet, setPinSet] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('roleito:auth:token');
    if (stored) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('expired');
        })
        .then((data: Session) => {
          setSession({ ...data, token: stored });
          setPinSet(data.pin_set);
        })
        .catch(() => {
          sessionStorage.removeItem('roleito:auth:token');
        })
        .finally(() => setLoading(false));
    } else {
      fetch(`${API_BASE}/auth/status`)
        .then((res) => res.json())
        .then((data: { pin_set: boolean }) => setPinSet(data.pin_set))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    sessionStorage.setItem('roleito:auth:token', data.token);
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const me = await meRes.json();
    setSession({ ...me, token: data.token });
    setPinSet(true);
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Setup failed' }));
      throw new Error(err.detail || 'Setup failed');
    }
    const data = await res.json();
    sessionStorage.setItem('roleito:auth:token', data.token);
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const me = await meRes.json();
    setSession({ ...me, token: data.token });
    setPinSet(true);
  }, []);

  const logout = useCallback(async () => {
    const token = sessionStorage.getItem('roleito:auth:token');
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem('roleito:auth:token');
    setSession(null);
  }, []);

  const getToken = useCallback(() => {
    return sessionStorage.getItem('roleito:auth:token');
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, pinSet, login, setupPin, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
