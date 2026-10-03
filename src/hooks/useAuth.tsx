import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { login, logout, restoreSession } from '../api/auth';
import { subscribeSession } from '../api/client';
import { AppState } from 'react-native';

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let latestSync = 0;
    const sync = async () => {
      const currentSync = ++latestSync;
      try {
        const valid = await restoreSession();
        if (active && currentSync === latestSync) setAuthenticated(valid);
      } catch {
        if (active && currentSync === latestSync) setAuthenticated(false);
      } finally {
        if (active && currentSync === latestSync) setLoading(false);
      }
    };
    const unsubscribe = subscribeSession(() => { void sync(); });
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    // O intervalo cobre a sessão aberta sem requisições; ao voltar do fundo, verificamos imediatamente.
    const timer = setInterval(() => { if (AppState.currentState === 'active') void sync(); }, 60_000);
    void sync();
    return () => { active = false; unsubscribe(); appState.remove(); clearInterval(timer); };
  }, []);

  return <AuthContext.Provider value={{ authenticated, loading, signIn: login, signOut: logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider ausente');
  return value;
}
