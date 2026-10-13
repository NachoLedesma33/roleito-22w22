import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_BASE = '/api';
const PROFILES_KEY = 'roleito:auth:profiles';
const MAX_PROFILES = 10;

/**
 * Perfil ya usado en este navegador. El `id` es interno (dedupe); la pantalla
 * muestra solo el nombre. La lista es local a propósito: si el login enumerara
 * los DMs de la máquina, cualquiera vería los nombres de todos.
 */
interface DMProfile {
  id: string;
  name: string;
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
  profiles: DMProfile[];
  login: (name: string, pin: string) => Promise<void>;
  registerDm: (name: string, pin: string) => Promise<void>;
  changePin: (currentPin: string | undefined, newPin: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readProfiles(): DMProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is DMProfile =>
        !!p &&
        typeof p === 'object' &&
        typeof (p as DMProfile).id === 'string' &&
        typeof (p as DMProfile).name === 'string',
    );
  } catch {
    return [];
  }
}

/** Guarda/actualiza `profile` al frente de la lista local (tope MAX_PROFILES). */
function storeProfile(profile: DMProfile): DMProfile[] {
  const next = [
    profile,
    ...readProfiles().filter((p) => p.id !== profile.id),
  ].slice(0, MAX_PROFILES);
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
  } catch {
    // localStorage lleno o bloqueado: la lista igual queda en memoria.
  }
  return next;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<DMProfile[]>([]);

  const rememberProfile = useCallback((me: { dm_id: string; dm_name: string }) => {
    setProfiles(storeProfile({ id: me.dm_id, name: me.dm_name }));
  }, []);

  useEffect(() => {
    setProfiles(readProfiles());
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
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (name: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
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
    rememberProfile(me);
  }, [rememberProfile]);

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
    rememberProfile(me);
  }, [rememberProfile]);

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
    rememberProfile(me);
  }, [rememberProfile]);

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
    <AuthContext.Provider value={{ session, loading, profiles, login, registerDm, changePin, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
