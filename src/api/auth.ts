import { emitSessionChange, publicClient, renewSession } from './client';
import { clearTokens, getTokens, replaceTokensIfCurrent, setTokens, tokenExpired } from '../utils/storage';

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
  if (tokenExpired(tokens.refresh)) {
    if (await replaceTokensIfCurrent(tokens.refresh, null)) emitSessionChange();
    return Boolean(await getTokens());
  }
  if (tokenExpired(tokens.access, 30)) {
    try { await renewSession(); }
    catch { return Boolean(await getTokens()); }
  }
  return true;
}
