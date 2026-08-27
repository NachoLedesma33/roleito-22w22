import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_BASE = 'http://localhost:8000/api';

interface DMBrief {
  id: string;
  name: string;
  created_at: string;
}

interface Session {
  token: string;
  role: string;
  created_at: number;
  last_seen: number;
  campaign_id: string | null;
  dm_id: string;
  dm_name: string;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  dms: DMBrief[];
  login: (dmId: string, pin: string) => Promise<void>;
  registerDm: (name: string, pin: string) => Promise<void>;
  changePin: (currentPin: string | undefined, newPin: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
  refreshDms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dms, setDms] = useState<DMBrief[]>([]);

  const refreshDms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/dms`);
      if (res.ok) setDms(await res.json());
    } catch {}
  }, []);

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
        })
        .catch(() => {
          sessionStorage.removeItem('roleito:auth:token');
        })
        .finally(() => {
          refreshDms();
          setLoading(false);
        });
    } else {
      refreshDms().finally(() => setLoading(false));
    }
  }, [refreshDms]);

  const login = useCallback(async (dmId: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dm_id: dmId, pin }),
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
  }, []);

  const registerDm = useCallback(async (name: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    sessionStorage.setItem('roleito:auth:token', data.token);
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const me = await meRes.json();
    setSession({ ...me, token: data.token });
    refreshDms();
  }, [refreshDms]);

  const changePin = useCallback(async (currentPin: string | undefined, newPin: string) => {
    const body: Record<string, string> = { new_pin: newPin };
    if (currentPin) body.current_pin = currentPin;
    const res = await fetch(`${API_BASE}/auth/change-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('roleito:auth:token')}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Change PIN failed' }));
      throw new Error(err.detail || 'Change PIN failed');
    }
    const data = await res.json();
    sessionStorage.setItem('roleito:auth:token', data.token);
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const me = await meRes.json();
    setSession({ ...me, token: data.token });
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
    <AuthContext.Provider value={{ session, loading, dms, login, registerDm, changePin, logout, getToken, refreshDms }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
