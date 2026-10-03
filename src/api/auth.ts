import { emitSessionChange, publicClient, renewSession } from './client';
import { clearTokens, getTokens, setTokens, tokenExpired } from '../utils/storage';

export async function login(username: string, password: string): Promise<void> {
  const { data } = await publicClient.post<{ access: string; refresh: string }>('token/', { username, password });
  await setTokens(data);
  emitSessionChange();
}

export async function logout(): Promise<void> {
  await clearTokens();
  emitSessionChange();
}

export async function restoreSession(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return false;
  if (tokenExpired(tokens.refresh)) { await logout(); return false; }
  if (tokenExpired(tokens.access, 30)) {
    try { await renewSession(); } catch { return false; }
  }
  return true;
}
